let model;
const fileInput = document.getElementById('file-input');
const image = document.getElementById('image');
const predictionElement = document.getElementById('prediction');
const inputError = document.getElementById('input-error');

async function loadModel() {
    model = await mobilenet.load();
}

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        inputError.textContent = '';
        const reader = new FileReader();
        reader.onload = (e) => {
            image.src = e.target.result;
            classifyImage();
        };
        reader.readAsDataURL(file);
    } else {
        inputError.textContent = 'Please upload a valid image file.';
    }
});

async function classifyImage() {
    if (!model) {
        await loadModel();
    }
    try {
        const predictions = await model.classify(image);
        displayPredictions(predictions);
    } catch (error) {
        console.error('Error during image classification:', error);
        inputError.textContent = 'Error processing the image.';
    }
}

function displayPredictions(predictions) {
    if (predictions && predictions.length > 0) {
        const topPrediction = predictions[0];
        predictionElement.textContent = `I am ${Math.round(topPrediction.probability * 100)}% sure this is a ${topPrediction.className}.`;
    } else {
        predictionElement.textContent = 'Unable to identify the breed.';
    }
}
