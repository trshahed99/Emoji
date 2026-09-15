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
            // যদি ফাইলটি .tgs বা অন্য ফরম্যাটের হয়, তবে ব্রাউজারে দেখানোর জন্য ভিডিও অথবা ইমেজ ট্যাগ সঠিকভাবে সেট করা
            if (data.path.endsWith('.tgs')) {
                // TGS ফাইল হলে সরাসরি লিংক বা প্লেয়ারের ব্যবস্থা
                emojiDisplay.innerHTML = `
                    <div style="background: #0f172a; padding: 10px; border-radius: 8px;">
                        <p style="color: #38bdf8; font-size: 14px; margin-bottom: 5px;">TGS অ্যানিমেশন ফাইল:</p>
                        <a href="${data.url}" target="_blank" style="color: #4ade80; text-decoration: none; font-weight: bold;">📥 ফাইল ডাউনলোড করুন</a>
                    </div>
                `;
            } else {
                // WebM বা ভিডিও ফরম্যাট হলে অটো-প্লে হবে
                emojiDisplay.innerHTML = `
                    <video src="${data.url}" 
                           autoplay 
                           loop 
                           muted 
                           playsinline 
                           style="width: 80px; height: 80px; background: transparent; border: none; object-fit: contain;">
                    </video>
                `;
            }
        } else {
            emojiDisplay.innerHTML = "<span style='color: #ef4444;'>ইমোজি পাওয়া যায়নি!</span>";
        }
    } catch (error) {
        emojiDisplay.innerHTML = "<span style='color: #ef4444;'>সার্ভার কানেকশন এরর!</span>";
        console.error(error);
    }
}
