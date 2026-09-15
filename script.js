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
            // ডিসপ্লে কন্টেইনার তৈরি
            emojiDisplay.innerHTML = `<div id="emojiContainer" style="width: 100px; height: 100px; margin: 0 auto; display: flex; justify-content: center; align-items: center;"></div>`;
            const container = document.getElementById('emojiContainer');
            const filePath = data.path.toLowerCase();

            // ১. TGS ফাইল (Telegram অ্যানিমেটেড ইমোজি)
            if (filePath.endsWith('.tgs')) {
                try {
                    // TGS ফাইল ডাউনলোড করে ArrayBuffer হিসেবে নেওয়া
                    const arrayBuffer = await fetch(data.url).then(res => res.arrayBuffer());
                    
                    // pako দিয়ে GZIP ডিকম্প্রেস করা
                    const decompressedData = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
                    const animData = JSON.parse(decompressedData);
                    
                    // Lottie দিয়ে রেন্ডার করা
                    lottie.loadAnimation({
                        container: container,
                        renderer: 'svg',
                        loop: true,
                        autoplay: true,
                        animationData: animData
                    });
                } catch (e) {
                    console.error("TGS লোড এরর:", e);
                    container.innerHTML = `<span style="color: #ef4444; font-size: 12px; text-align: center;">অ্যানিমেশন লোড হয়নি</span>`;
                }
            } 
            // ২. সাধারণ Lottie JSON ফাইল
            else if (filePath.endsWith('.json')) {
                try {
                    const animData = await fetch(data.url).then(res => res.json());
                    lottie.loadAnimation({
                        container: container,
                        renderer: 'svg',
                        loop: true,
                        autoplay: true,
                        animationData: animData
                    });
                } catch (e) {
                    container.innerHTML = `<span style="color: #ef4444; font-size: 12px;">JSON লোড এরর!</span>`;
                }
            }
            // ৩. ভিডিও ফরম্যাট (.webm বা .mp4)
            else if (filePath.endsWith('.webm') || filePath.endsWith('.mp4')) {
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
            // ৪. ইমেজ ফরম্যাট (.webp, .png, .jpg, .gif)
            else if (filePath.endsWith('.webp') || filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.gif')) {
                container.innerHTML = `<img src="${data.url}" style="width: 100%; height: 100%; object-fit: contain;">`;
            } 
            // ৫. অজানা ফরম্যাট (Fallback: আগে ইমেজ হিসেবে ট্রাই করবে, না হলে ভিডিও হিসেবে)
            else {
                container.innerHTML = `
                    <img src="${data.url}" style="width: 100%; height: 100%; object-fit: contain;" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <video src="${data.url}" autoplay loop muted playsinline 
                           style="width: 100%; height: 100%; object-fit: contain; display: none;"></video>
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
