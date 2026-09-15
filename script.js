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
