"""
Convert TorchXRayVision PSPNet segmentation model to ONNX format.
This model segments 14 anatomical regions in chest X-rays.
"""

import torch
import torchxrayvision as xrv
import os

# Anatomical region labels from the PSPNet model
ANATOMY_LABELS = [
    'Left Clavicle',
    'Right Clavicle',
    'Left Scapula',
    'Right Scapula',
    'Left Lung',
    'Right Lung',
    'Left Hilus Pulmonis',
    'Right Hilus Pulmonis',
    'Heart',
    'Aorta',
    'Facies Diaphragmatica',
    'Mediastinum',
    'Weasand',
    'Spine'
]

def convert_segmentation_model():
    print("Loading TorchXRayVision PSPNet segmentation model...")

    # Load the pre-trained segmentation model
    model = xrv.baseline_models.chestx_det.PSPNet()
    model.eval()

    print(f"Segmentation model loaded!")
    print(f"Model outputs {len(ANATOMY_LABELS)} anatomical regions")

    # PSPNet expects 512x512 input
    dummy_input = torch.randn(1, 1, 512, 512)

    # Output path
    output_dir = os.path.join(os.path.dirname(__file__), "..", "public", "models")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "chest_segmentation.onnx")

    print(f"\nConverting to ONNX format (opset 12)...")

    # Export to ONNX
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=12,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['segmentation'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'segmentation': {0: 'batch_size'}
        },
        verbose=False
    )

    # Get file size
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\nModel saved to: {output_path}")
    print(f"Model size: {file_size:.1f} MB")

    # Verify the model
    print("\nVerifying ONNX model...")
    import onnx
    from onnx import shape_inference

    onnx_model = onnx.load(output_path)
    onnx_model = shape_inference.infer_shapes(onnx_model)
    onnx.checker.check_model(onnx_model)
    onnx.save(onnx_model, output_path)

    print("ONNX model verification passed!")

    # Print model info
    print("\n=== Segmentation Model Info ===")
    print(f"Opset version: 12")
    print(f"Input: 'input' shape [batch, 1, 512, 512]")
    print(f"Output: 'segmentation' shape [batch, 14, 512, 512]")
    print(f"\nAnatomical Regions ({len(ANATOMY_LABELS)}):")
    for i, label in enumerate(ANATOMY_LABELS):
        print(f"  {i}: {label}")

    return output_path

if __name__ == "__main__":
    output_path = convert_segmentation_model()

    # Save anatomy labels
    labels_path = os.path.join(os.path.dirname(output_path), "anatomy_labels.txt")
    with open(labels_path, 'w') as f:
        for label in ANATOMY_LABELS:
            f.write(f"{label}\n")
    print(f"\nAnatomy labels saved to: {labels_path}")
