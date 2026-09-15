// লোকাল টেস্টের সময় লোকাল আইপি এবং HidenCloud এ আপলোড করলে সেখানে লাইভ সার্ভার লিংক বসাবেন
const BACKEND_URL = "http://192.168.0.100:5000"; 

// ==========================================
// ১. ফাইল আপলোড ফাংশন
// ==========================================
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const status = document.getElementById('uploadStatus');

    if (fileInput.files.length === 0) {
        alert("দয়া করে একটি ফাইল সিলেক্ট করুন!");
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
            status.innerText = "আপলোড ব্যর্থ হয়েছে!";
        }
    } catch (error) {
        status.innerText = "সার্ভার কানেকশন এরর!";
        console.error(error);
    }
}

// ==========================================
// ২. ফাইল বা ছবি দেখার ফাংশন
// ==========================================
async function viewFile() {
    const fileId = document.getElementById('fileIdInput').value.trim();
    const displayArea = document.getElementById('displayArea');

    if (!fileId) {
        alert("দয়া করে ফাইল আইডি দিন!");
        return;
    }

    displayArea.innerHTML = "লোড হচ্ছে...";

    try {
        let response = await fetch(`${BACKEND_URL}/get-file?file_id=${encodeURIComponent(fileId)}`);
        let data = await response.json();

        if (data.url) {
            if (data.type === 'photo') {
                displayArea.innerHTML = `<img src="${data.url}" alt="Telegram Image" style="max-width: 100%; margin-top: 15px; border-radius: 6px;">`;
            } else {
                // ভিডিও হলে CORS এড়ানোর জন্য Proxy ব্যবহার করে Blob ডাউনলোড করা হচ্ছে
                try {
                    const proxyUrl = `${BACKEND_URL}/proxy?url=${encodeURIComponent(data.url)}`;
                    const videoBlob = await fetch(proxyUrl).then(res => res.blob());
                    const videoUrl = URL.createObjectURL(videoBlob);
                    
                    displayArea.innerHTML = `
                        <video src="${videoUrl}" 
                               controls 
                               autoplay 
                               loop 
                               playsinline 
                               style="max-width: 100%; margin-top: 15px; border-radius: 6px;">
                        </video>
                    `;
                } catch (err) {
                    displayArea.innerHTML = `<span style='color: #ef4444;'>ভিডিও লোড হয়নি!</span>`;
                }
            }
        } else {
            displayArea.innerHTML = "<span style='color: #ef4444;'>ফাইল পাওয়া যায়নি!</span>";
        }
    } catch (error) {
        displayArea.innerHTML = "<span style='color: #ef4444;'>সার্ভার কানেকশন এরর!</span>";
        console.error(error);
    }
}

// ==========================================
// ৩. ইমোজি দেখার ফাংশন (TGS, Video, Image)
// ==========================================
async function viewEmoji() {
    const emojiId = document.getElementById('emojiIdInput').value.trim();
    const emojiDisplay = document.getElementById('emojiDisplay');

    if (!emojiId) {
        alert("দয়া করে ইমোজি আইডি দিন!");
        return;
    }

    emojiDisplay.innerHTML = "ইমোজি লোড হচ্ছে...";

    try {
        let response = await fetch(`${BACKEND_URL}/get-emoji?emoji_id=${encodeURIComponent(emojiId)}`);
        let data = await response.json();

        if (data.success) {
            emojiDisplay.innerHTML = `<div id="emojiContainer" style="width: 100px; height: 100px; margin: 0 auto; display: flex; justify-content: center; align-items: center;"></div>`;
            const container = document.getElementById('emojiContainer');
            const filePath = data.path ? data.path.toLowerCase() : '';

            const isVideo = data.is_video || filePath.endsWith('.webm') || filePath.endsWith('.mp4');
            const isAnimated = data.is_animated || filePath.endsWith('.tgs');

            // ১. TGS অ্যানিমেটেড ইমোজি
            if (isAnimated) {
                try {
                    // Proxy এর মাধ্যমে TGS ফাইলটি আনছি
                    const proxyUrl = `${BACKEND_URL}/proxy?url=${encodeURIComponent(data.url)}`;
                    const arrayBuffer = await fetch(proxyUrl).then(res => res.arrayBuffer());
                    
                    const decompressedData = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
                    const animData = JSON.parse(decompressedData);
                    
                    lottie.loadAnimation({
                        container: container,
                        renderer: 'svg',
                        loop: true,
                        autoplay: true,
                        animationData: animData
                    });
                } catch (e) {
                    console.error("TGS লোড এরর:", e);
                    container.innerHTML = `<span style="color: #ef4444; font-size: 12px; text-align: center;">অ্যানিমেশন লোড হয়নি</span>`;
                }
            } 
            // ২. ভিডিও ইমোজি (.webm / .mp4)
            else if (isVideo) {
                try {
                    // Proxy এর মাধ্যমে ভিডিও ফাইলটি আনছি
                    const proxyUrl = `${BACKEND_URL}/proxy?url=${encodeURIComponent(data.url)}`;
                    const videoBlob = await fetch(proxyUrl).then(res => res.blob());
                    const videoUrl = URL.createObjectURL(videoBlob);
                    
                    const videoElement = document.createElement('video');
                    videoElement.src = videoUrl;
                    videoElement.autoplay = true;
                    videoElement.loop = true;
                    videoElement.muted = true; 
                    videoElement.playsInline = true;
                    videoElement.style.width = '100%';
                    videoElement.style.height = '100%';
                    videoElement.style.objectFit = 'contain';
                    videoElement.style.background = 'transparent';
                    
                    container.appendChild(videoElement);
                } catch (e) {
                    console.error("ভিডিও লোড এরর:", e);
                    container.innerHTML = `<span style="color: #ef4444; font-size: 12px;">ভিডিও লোড হয়নি</span>`;
                }
            } 
            // ৩. স্ট্যাটিক ইমোজি (.webp / .png) - এগুলোতে Proxy লাগে না, সরাসরি লোড হয়
            else {
                container.innerHTML = `<img src="${data.url}" style="width: 100%; height: 100%; object-fit: contain;">`;
            }

        } else {
            emojiDisplay.innerHTML = "<span style='color: #ef4444;'>ইমোজি পাওয়া যায়নি!</span>";
        }
    } catch (error) {
        emojiDisplay.innerHTML = "<span style='color: #ef4444;'>সার্ভার কানেকশন এরর!</span>";
        console.error(error);
    }
}
