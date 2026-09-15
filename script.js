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
            // ডিসপ্লে এরিয়া ক্লিয়ার করে নতুন কন্টেইনার বানানো
            emojiDisplay.innerHTML = `<div id="lottieContainer" style="width: 90px; height: 90px; margin: 0 auto; display: flex; justify-content: center; align-items: center;"></div>`;
            const container = document.getElementById('lottieContainer');

            if (data.path.endsWith('.tgs') || data.path.endsWith('.json')) {
                // যদি টেলিগ্রামের TGS অ্যানিমেশন ফাইল হয়, তবে Lottie দিয়ে রেন্ডার করবে
                // (যেহেতু টেলিগ্রামের tgs ফাইল কমপ্রেসড থাকে, সরাসরি জেসন লিংকের জন্য ব্রাউজার ফেচ করে লোড করবে)
                try {
                    let animData = await fetch(data.url).then(res => res.json());
                    lottie.loadAnimation({
                        container: container,
                        renderer: 'svg',
                        loop: true,
                        autoplay: true,
                        animationData: animData
                    });
                } catch (e) {
                    // কোনো কারণে ফেচ না হলে ডিরেক্ট লিংক ভিডিও বা ইমেজ হিসেবে দেখানোর ফলব্যাক
                    container.innerHTML = `<img src="${data.url}" style="width: 100%; height: 100%; object-fit: contain;">`;
                }
            } 
            else if (data.path.endsWith('.webm') || data.path.endsWith('.mp4')) {
                // ভিডিও ফরম্যাট হলে অটো-প্লে হবে
                container.innerHTML = `
                    <video src="${data.url}" 
                           autoplay 
                           loop 
                           muted 
                           playsinline 
                           style="width: 100%; height: 100%; object-fit: contain; background: transparent;">
                    </video>
                `;
            } 
            else {
                // সাধারণ ছবি হলে
                container.innerHTML = `<img src="${data.url}" style="width: 100%; height: 100%; object-fit: contain;">`;
            }

        } else {
            emojiDisplay.innerHTML = "<span style='color: #ef4444;'>ইমোজি পাওয়া যায়নি!</span>";
        }
    } catch (error) {
        emojiDisplay.innerHTML = "<span style='color: #ef4444;'>সার্ভার কানেকশন এরর!</span>";
        console.error(error);
    }
}
