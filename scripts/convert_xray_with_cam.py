"""
Convert TorchXRayVision DenseNet model to ONNX with CAM (Class Activation Map) support.
This allows generating heatmaps showing WHERE pathologies are suspected.

IMPORTANT: Uses the same wrapper approach as convert_xray_model.py:
- Accepts [-1, 1] normalized input
- Scales to [-1024, 1024] internally
- Applies sigmoid directly (bypasses op_threshs)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchxrayvision as xrv
import os
import numpy as np

class DenseNetWithCAM(nn.Module):
    """
    Wrapper that outputs both predictions and feature maps for CAM visualization.

    Key differences from original model:
    1. Accepts [-1, 1] input and scales to [-1024, 1024] internally
    2. Bypasses op_threshs (uses sigmoid directly) for clean ONNX export
    3. Returns feature maps for CAM heatmap generation
    """

    def __init__(self, base_model):
        super().__init__()
        self.features = base_model.features  # DenseNet feature extractor
        self.classifier = base_model.classifier  # Final classifier layer

    def forward(self, x):
        # Scale from [-1, 1] to [-1024, 1024] (TorchXRayVision expected range)
        x = x * 1024.0

        # Get feature maps from the last conv layer
        features = self.features(x)  # Shape: [batch, 1024, 7, 7] for 224x224 input

        # Apply ReLU just like the original model does
        features_relu = F.relu(features, inplace=False)

        # Global average pooling (same as original model)
        pooled = F.adaptive_avg_pool2d(features_relu, (1, 1))
        pooled = torch.flatten(pooled, 1)  # [batch, 1024]

        # Get predictions
        logits = self.classifier(pooled)  # [batch, 18]

        # Apply sigmoid to get probabilities (bypass op_threshs for clean ONNX export)
        probs = torch.sigmoid(logits)

        # Return both probabilities and feature maps for CAM
        return probs, features_relu


def convert_model_with_cam():
    print("Loading TorchXRayVision DenseNet model...")

    # Load the pre-trained model
    base_model = xrv.models.DenseNet(weights="densenet121-res224-all")
    base_model.eval()

    # Wrap with CAM support
    model = DenseNetWithCAM(base_model)
    model.eval()

    print(f"Model loaded with {len(base_model.pathologies)} pathologies")

    # Get classifier weights (needed for CAM computation)
    classifier_weights = base_model.classifier.weight.detach().numpy()  # [18, 1024]

    print("\nTesting model with different inputs...")

    # Test with various inputs (in [-1, 1] range)
    test_input = torch.randn(1, 1, 224, 224).clamp(-1, 1)
    with torch.no_grad():
        probs1, features1 = model(test_input)
        print(f"Random input -> probs range: [{probs1.min().item():.4f}, {probs1.max().item():.4f}]")
        print(f"Features shape: {features1.shape}")  # [1, 1024, 7, 7]

    # Test with dark input
    dark_input = torch.full((1, 1, 224, 224), -0.7)
    with torch.no_grad():
        probs2, _ = model(dark_input)
        print(f"Dark input -> top prob: {probs2.max().item():.4f}")

    # Test with bright input
    bright_input = torch.full((1, 1, 224, 224), 0.7)
    with torch.no_grad():
        probs3, _ = model(bright_input)
        print(f"Bright input -> top prob: {probs3.max().item():.4f}")

    # Verify outputs differ
    diff = (probs2 - probs3).abs().mean().item()
    print(f"Output difference (dark vs bright): {diff:.4f}")
    if diff < 0.01:
        print("WARNING: Outputs are too similar!")
    else:
        print("OK: Model produces different outputs for different inputs")

    # Output paths
    output_dir = os.path.join(os.path.dirname(__file__), "..", "public", "models")
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "chest_xray_cam.onnx")
    weights_path = os.path.join(output_dir, "classifier_weights.bin")

    print(f"\nExporting to ONNX with CAM support...")

    # Create dummy input (in [-1, 1] range)
    dummy_input = torch.zeros(1, 1, 224, 224)

    # Export to ONNX
    torch.onnx.export(
        model,
        dummy_input,
        model_path,
        export_params=True,
        opset_version=11,  # Same as base model for compatibility
        do_constant_folding=True,
        input_names=['input'],
        output_names=['probs', 'features'],  # Changed 'logits' to 'probs'
        dynamic_axes={
            'input': {0: 'batch_size'},
            'probs': {0: 'batch_size'},
            'features': {0: 'batch_size'}
        },
        verbose=False
    )

    # Save classifier weights for CAM computation in browser
    classifier_weights.astype(np.float32).tofile(weights_path)

    # Get file sizes
    model_size = os.path.getsize(model_path) / (1024 * 1024)
    weights_size = os.path.getsize(weights_path) / 1024

    print(f"\nModel saved to: {model_path}")
    print(f"Model size: {model_size:.1f} MB")
    print(f"Classifier weights saved to: {weights_path}")
    print(f"Weights size: {weights_size:.1f} KB")

    # Verify ONNX model
    print("\nVerifying ONNX model...")
    import onnx
    from onnx import shape_inference

    onnx_model = onnx.load(model_path)
    onnx_model = shape_inference.infer_shapes(onnx_model)
    onnx.checker.check_model(onnx_model)
    onnx.save(onnx_model, model_path)

    print("ONNX model verification passed!")

    # Test with ONNX Runtime
    print("\nTesting ONNX model with onnxruntime...")
    import onnxruntime as ort

    session = ort.InferenceSession(model_path)

    # Test with different inputs
    test_np_dark = np.full((1, 1, 224, 224), -0.7, dtype=np.float32)
    test_np_bright = np.full((1, 1, 224, 224), 0.7, dtype=np.float32)

    out_dark = session.run(None, {'input': test_np_dark})
    out_bright = session.run(None, {'input': test_np_bright})

    print(f"ONNX dark input -> probs: {out_dark[0][0][:5]}...")
    print(f"ONNX bright input -> probs: {out_bright[0][0][:5]}...")
    print(f"ONNX features shape: {out_dark[1].shape}")
    print(f"ONNX output difference: {np.abs(out_dark[0] - out_bright[0]).mean():.4f}")

    # Print model info
    print("\n" + "=" * 50)
    print("MODEL INFO")
    print("=" * 50)
    print(f"Input: 'input' shape [batch, 1, 224, 224], range [-1, 1]")
    print(f"Output 1: 'probs' shape [batch, 18], range [0, 1] (probabilities)")
    print(f"Output 2: 'features' shape [batch, 1024, 7, 7] - feature maps for CAM")
    print(f"\nClassifier weights shape: {classifier_weights.shape}")
    print(f"\nPathologies:")
    for i, p in enumerate(base_model.pathologies):
        print(f"  {i}: {p}")

    return model_path, base_model.pathologies, classifier_weights


if __name__ == "__main__":
    model_path, pathologies, weights = convert_model_with_cam()

    # Save pathology labels
    labels_path = os.path.join(os.path.dirname(model_path), "pathology_labels.txt")
    with open(labels_path, 'w') as f:
        for p in pathologies:
            f.write(f"{p}\n")
    print(f"\nPathology labels saved to: {labels_path}")

    print("\n=== CAM Computation (Browser Side) ===")
    print("For each pathology i with high probability:")
    print("  1. Get classifier weights W[i] of shape [1024]")
    print("  2. Get feature maps F of shape [1024, 7, 7]")
    print("  3. CAM[i] = sum(W[i] * F, axis=0) -> shape [7, 7]")
    print("  4. Upsample CAM to 224x224 and overlay on image")
