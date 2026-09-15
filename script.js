// লোকাল টেস্টের সময় লোকাল আইপি এবং HidenCloud এ আপলোড করলে সেখানে লাইভ সার্ভার লিংক বসাবেন
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

    status.innerText = "আপলোড হচ্ছে... অপেক্ষা করুন।";

    try {
        let response = await fetch(`${BACKEND_URL}/upload`, {
            method: "POST",
            body: formData
        });
        let data = await response.json();
        
        if(data.success) {
            status.innerHTML = `সফল! ফাইল আইডি কপি করে রাখুন: <br><input type="text" value="${data.file_id}" readonly style="background:#0f172a; color:#38bdf8; text-align:center;">`;
        } else {
            status.innerText = "আপলোড ব্যর্থ হয়েছে!";
        }
    } catch (error) {
        status.innerText = "সার্ভার কানেকশন এরর!";
        console.error(error);
    }
}

async function viewFile() {
    const fileId = document.getElementById('fileIdInput').value.trim();
    const displayArea = document.getElementById('displayArea');

    if (!fileId) {
        alert("দয়া করে ফাইল আইডি দিন!");
        return;
    }

    displayArea.innerHTML = "লোড হচ্ছে...";

    try {
        let response = await fetch(`${BACKEND_URL}/get-file?file_id=${encodeURIComponent(fileId)}`);
        let data = await response.json();

        if (data.url) {
            if (data.type === 'photo') {
                displayArea.innerHTML = `<img src="${data.url}" alt="Telegram Image">`;
            } else {
                displayArea.innerHTML = `<video src="${data.url}" controls autoplay loop></video>`;
            }
        } else {
            displayArea.innerHTML = "ফাইল পাওয়া যায়নি!";
        }
    } catch (error) {
        displayArea.innerHTML = "সার্ভার কানেকশন এরর!";
    }
}

async function viewEmoji() {
    const emojiId = document.getElementById('emojiIdInput').value.trim();
    const emojiDisplay = document.getElementById('emojiDisplay');

    if (!emojiId) {
        alert("দয়া করে ইমোজি আইডি দিন!");
        return;
    }

    emojiDisplay.innerHTML = "ইমোজি লোড হচ্ছে...";

    try {
        let response = await fetch(`${BACKEND_URL}/get-emoji?emoji_id=${encodeURIComponent(emojiId)}`);
        let data = await response.json();

        if (data.success) {
            // টেলিগ্রামের কাস্টম ইমোজি সরাসরি অটো-প্লে এবং লুপ হবে, কোনো কন্ট্রোল বা ডাউনলোড অপশন থাকবে না
            emojiDisplay.innerHTML = `
                <video src="${data.url}" 
                       autoplay 
                       loop 
                       muted 
                       playsinline 
                       style="width: 80px; height: 80px; background: transparent; border: none;">
                </video>
            `;
        } else {
            emojiDisplay.innerHTML = "ইমোজি পাওয়া যায়নি!";
        }
    } catch (error) {
        emojiDisplay.innerHTML = "সার্ভার কানেকশন এরর!";
        console.error(error);
    }
}
