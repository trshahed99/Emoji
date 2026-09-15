// আপনার লোকাল আইপি অথবা HidenCloud-এর সার্ভার লিংক এখানে বসাবেন
const BACKEND_URL = "http://192.168.0.100:5000"; 

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const status = document.getElementById('uploadStatus');

    if (fileInput.files.length === 0) {
        alert("দয়া করে একটি ফাইল সিলেক্ট করুন!");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    status.innerText = "আপলোড হচ্ছে... একটু অপেক্ষা করুন।";

    try {
        let response = await fetch(`${BACKEND_URL}/upload`, {
            method: "POST",
            body: formData
        });
        let data = await response.json();
        
        if(data.success) {
            status.innerHTML = `সফল! ফাইল আইডি কপি করে রাখুন: <br><input type="text" value="${data.file_id}" readonly>`;
        } else {
            status.innerText = "আপলোড ব্যর্থ হয়েছে: " + (data.error || "অজানা সমস্যা");
        }
    } catch (error) {
        status.innerText = "সার্ভার কানেকশন এরর! পাইথন সার্ভার কি অন আছে?";
        console.error(error);
    }
}

async function viewFile() {
    const fileId = document.getElementById('fileIdInput').value.trim();
    const displayArea = document.getElementById('displayArea');

    if (!fileId) {
        alert("দয়া করে সঠিক ফাইল আইডি দিন!");
        return;
    }

    displayArea.innerHTML = "ফাইল লোড হচ্ছে...";

    try {
        let response = await fetch(`${BACKEND_URL}/get-file?file_id=${encodeURIComponent(fileId)}`);
        let data = await response.json();

        if (data.url) {
            if (data.type === 'photo') {
                displayArea.innerHTML = `<img src="${data.url}" alt="Telegram Image">`;
            } else {
                displayArea.innerHTML = `<video src="${data.url}" controls autoplay></video>`;
            }
        } else {
            displayArea.innerHTML = "ফাইল পাওয়া যায়নি বা আইডি ভুল!";
        }
    } catch (error) {
        displayArea.innerHTML = "সার্ভার কানেকশন এরর!";
        console.error(error);
    }
}
