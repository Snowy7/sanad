"""
Convert TorchXRayVision DenseNet model to ONNX format for browser inference.
Includes input scaling and bypasses problematic op_threshs operation.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchxrayvision as xrv
import os


class DenseNetForExport(nn.Module):
    """
    Clean wrapper for ONNX export that:
    1. Accepts [-1, 1] normalized input
    2. Scales to [-1024, 1024] internally
    3. Bypasses problematic op_threshs (uses raw sigmoid instead)
    """

    def __init__(self, base_model):
        super().__init__()
        # Copy the feature extractor and classifier
        self.features = base_model.features
        self.classifier = base_model.classifier

    def forward(self, x):
        # Scale from [-1, 1] to [-1024, 1024]
        x = x * 1024.0

        # Feature extraction (same as original DenseNet)
        features = self.features(x)
        out = F.relu(features, inplace=True)
        out = F.adaptive_avg_pool2d(out, (1, 1))
        out = torch.flatten(out, 1)

        # Classification
        out = self.classifier(out)

        # Apply sigmoid to get probabilities (skip op_threshs which causes ONNX issues)
        out = torch.sigmoid(out)

        return out


def convert_model():
    print("Loading TorchXRayVision DenseNet model...")

    # Load the pre-trained DenseNet model
    base_model = xrv.models.DenseNet(weights="densenet121-res224-all")
    base_model.eval()

    # Create clean export wrapper
    model = DenseNetForExport(base_model)
    model.eval()

    print(f"Model loaded successfully!")
    print(f"Model outputs {len(base_model.pathologies)} pathology predictions")

    # Test with various inputs
    print("\nTesting model with different inputs...")

    # Test 1: Random normalized input
    test_input = torch.randn(1, 1, 224, 224).clamp(-1, 1)
    with torch.no_grad():
        output1 = model(test_input)
        print(f"Random input -> output range: [{output1.min().item():.4f}, {output1.max().item():.4f}]")

    # Test 2: Dark input (like lung fields)
    dark_input = torch.full((1, 1, 224, 224), -0.7)
    with torch.no_grad():
        output2 = model(dark_input)
        print(f"Dark input -> top prediction: {output2.max().item():.4f}")

    # Test 3: Bright input (like bone)
    bright_input = torch.full((1, 1, 224, 224), 0.7)
    with torch.no_grad():
        output3 = model(bright_input)
        print(f"Bright input -> top prediction: {output3.max().item():.4f}")

    # Verify outputs differ
    diff = (output2 - output3).abs().mean().item()
    print(f"Output difference (dark vs bright): {diff:.4f}")

    if diff < 0.01:
        print("WARNING: Outputs are too similar!")
    else:
        print("OK: Model produces different outputs for different inputs")

    # Create dummy input
    dummy_input = torch.zeros(1, 1, 224, 224)

    # Output path
    output_dir = os.path.join(os.path.dirname(__file__), "..", "public", "models")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "chest_xray.onnx")

    print(f"\nConverting to ONNX format...")

    # Export to ONNX
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        },
        verbose=False
    )

    # Get file size
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Model saved to: {output_path}")
    print(f"Model size: {file_size:.1f} MB")

    # Verify ONNX model
    print("\nVerifying ONNX model...")
    import onnx
    from onnx import shape_inference

    onnx_model = onnx.load(output_path)
    onnx_model = shape_inference.infer_shapes(onnx_model)
    onnx.checker.check_model(onnx_model)
    onnx.save(onnx_model, output_path)
    print("ONNX verification passed!")

    # Test with ONNX Runtime
    print("\nTesting ONNX model with onnxruntime...")
    import onnxruntime as ort
    import numpy as np

    session = ort.InferenceSession(output_path)

    # Test with different inputs
    test_np_dark = np.full((1, 1, 224, 224), -0.7, dtype=np.float32)
    test_np_bright = np.full((1, 1, 224, 224), 0.7, dtype=np.float32)

    out_dark = session.run(None, {'input': test_np_dark})[0]
    out_bright = session.run(None, {'input': test_np_bright})[0]

    print(f"ONNX dark input -> output: {out_dark[0][:5]}...")
    print(f"ONNX bright input -> output: {out_bright[0][:5]}...")
    print(f"ONNX output difference: {np.abs(out_dark - out_bright).mean():.4f}")

    # Print model info
    print("\n" + "=" * 50)
    print("MODEL INFO")
    print("=" * 50)
    print(f"Input: shape [batch, 1, 224, 224], range [-1, 1]")
    print(f"Output: shape [batch, 18], range [0, 1] (probabilities)")
    print(f"\nPathologies:")
    for i, p in enumerate(base_model.pathologies):
        print(f"  {i}: {p}")

    return output_path, base_model.pathologies


if __name__ == "__main__":
    output_path, pathologies = convert_model()

    # Save pathology labels
    labels_path = os.path.join(os.path.dirname(output_path), "pathology_labels.txt")
    with open(labels_path, 'w') as f:
        for p in pathologies:
            f.write(f"{p}\n")
    print(f"\nPathology labels saved to: {labels_path}")
