document.addEventListener('DOMContentLoaded', () => {
    // Favicon Loader
    const favicons = document.querySelectorAll('.favicon');
    favicons.forEach(img => {
        const url = img.dataset.url;
        if (url) {
            // Googleのfaviconサービスを使ってアイコンを取得
            const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${new URL(url).hostname}`;
            img.src = faviconUrl;
            img.onerror = () => {
                // アイコンが取得できなかった場合は非表示にする
                img.style.display = 'none';
            };
        }
    });

    // 3Dスクロールアニメーション
    const categories = document.querySelectorAll('.category');
    const observer = new window.IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.2 });
    categories.forEach(cat => observer.observe(cat));

    // 3Dチルト効果
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * 8; // 最大8度
            const rotateY = ((x - centerX) / centerX) * -8;
            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
            card.classList.add('tilt');
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.classList.remove('tilt');
        });
    });

    // Settings Panel
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsClose = document.getElementById('settings-close');
    const overlay = document.getElementById('overlay');

    function openSettings() {
        settingsPanel.classList.add('open');
        overlay.classList.add('visible');
    }

    function closeSettings() {
        settingsPanel.classList.remove('open');
        overlay.classList.remove('visible');
    }

    settingsToggle.addEventListener('click', openSettings);
    settingsClose.addEventListener('click', closeSettings);
    overlay.addEventListener('click', closeSettings);

    // Chatbot UI
    const chatToggle = document.getElementById('chat-toggle');
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const apiKeyBlock = document.getElementById('chat-api-key-block');
    const apiKeyInput = document.getElementById('chat-api-key');
    const apiKeySave = document.getElementById('chat-api-key-save');

    const API_KEY_STORAGE = 'openai_api_key';
    let conversationHistory = [];

    function getApiKey() {
        return localStorage.getItem(API_KEY_STORAGE) || '';
    }

    function setApiKey(key) {
        localStorage.setItem(API_KEY_STORAGE, key);
    }

    function showApiKeyBlock(show) {
        apiKeyBlock.style.display = show ? 'flex' : 'none';
        chatInput.disabled = show;
        chatSend.disabled = show;
    }

    function initializeChat() {
        conversationHistory = [{ role: 'system', content: 'あなたは親切で有能な日本語のAIアシスタントです。ユーザーの質問に的確かつ分かりやすく回答してください。' }];
        const apiKey = getApiKey();
        if (!apiKey) {
            chatInput.disabled = true;
            chatSend.disabled = true;
            chatInput.placeholder = '←左上の設定からAPIキーを保存してください';
        } else {
            chatInput.disabled = false;
            chatSend.disabled = false;
            chatInput.placeholder = 'メッセージを入力...';
        }
        apiKeyInput.value = apiKey || '';
    }

    apiKeySave.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            setApiKey(key);
            apiKeySave.textContent = '保存完了!';
            apiKeySave.style.backgroundColor = '#68D391'; // green-400
            
            setTimeout(() => {
                apiKeySave.textContent = '保存';
                apiKeySave.style.backgroundColor = '';
                closeSettings();
            }, 1500);

            initializeChat();
        } else {
            // Handle case where user tries to save an empty key
            localStorage.removeItem(API_KEY_STORAGE);
            initializeChat();
        }
    });

    chatToggle.addEventListener('click', () => {
        chatContainer.classList.toggle('open');
    });

    async function fetchOpenAIChat(userMessage) {
        const apiKey = getApiKey();
        if (!apiKey) return 'APIキーが設定されていません。';

        conversationHistory.push({ role: 'user', content: userMessage });

        const endpoint = 'https://api.openai.com/v1/chat/completions';
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
        const body = {
            model: 'gpt-3.5-turbo',
            messages: conversationHistory,
            max_tokens: 1000,
            temperature: 0.7
        };

        try {
            const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                const status = res.status;
                let message = `エラー (${status})。`;
                if (status === 401) message = 'APIキーが正しくないようです。';
                else if (status === 429) message = 'APIの利用上限に達しました。';
                else if (errorData && errorData.error) message += `\n${errorData.error.message}`;
                return message;
            }
            const data = await res.json();
            const botReply = data.choices[0].message.content.trim();
            conversationHistory.push({ role: 'assistant', content: botReply });
            return botReply;
        } catch (e) {
            return 'ネットワークエラーが発生しました。';
        }
    }

    // Gemini API用のfetch関数
    async function fetchGeminiChat(userMessage) {
        const apiKey = getApiKey();
        if (!apiKey) return 'APIキーが設定されていません。';

        // Gemini APIのエンドポイント
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const headers = {
            'Content-Type': 'application/json'
        };
        // 簡潔な返答を促すプロンプトを付加
        const concisePrompt = '※できるだけ簡潔に答えてください。';
        const body = {
            contents: [
                {
                    parts: [
                        { text: `${concisePrompt}\n${userMessage}` }
                    ]
                }
            ]
        };

        try {
            const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                const status = res.status;
                let message = `エラー (${status})。`;
                if (status === 401) message = 'APIキーが正しくないようです。';
                else if (status === 429) message = 'APIの利用上限に達しました。';
                else if (errorData && errorData.error && errorData.error.message) message += `\n${errorData.error.message}`;
                return message;
            }
            const data = await res.json();
            // Gemini APIのレスポンス構造に合わせて返答を抽出
            const botReply = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text
                ? data.candidates[0].content.parts[0].text.trim()
                : '返答が取得できませんでした。';
            return botReply;
        } catch (e) {
            return 'ネットワークエラーが発生しました。';
        }
    }

    // サイトリストをボタンリストHTMLに変換する関数
    function createSiteButtonList(sites) {
        if (!sites || sites.length === 0) return '';
        let html = '<div class="site-button-list-block"><span>おすすめサイト：</span><ul class="site-button-list">';
        for (const s of sites) {
            html += `<li><a href="${s.url}" class="site-link-btn" target="_blank" rel="noopener">${s.label}</a></li>`;
        }
        html += '</ul></div>';
        return html;
    }

    // ジャンルごとのおすすめサイト案内
    const recommendSites = [
        {
            keywords: ['計算', '数式', '微分', '積分', '方程式', '行列', '統計', 'sin', 'cos', 'log', 'グラフ'],
            pattern: /[0-9]+\s*([\+\-\*\/\^]|=)\s*[0-9xXyY\(\)\.]+|sin|cos|log|tan|exp|sqrt|\d+\s*\!|\d+\s*%/i,
            message: `数学や数式の計算には、以下の外部サイトが便利です。`,
            sites: [
                { label: 'WolframAlpha（高度な数式・グラフ・統計）', url: 'https://www.wolframalpha.com/' },
                { label: 'Symbolab（方程式・微積分・行列など）', url: 'https://www.symbolab.com/' },
                { label: 'Desmos（グラフ作成）', url: 'https://www.desmos.com/calculator' }
            ]
        },
        {
            keywords: ['画像', 'イラスト', '写真', '生成', '描いて', '絵', 'AI画像'],
            message: `画像やイラストの生成・編集には、以下の外部サイトがおすすめです。`,
            sites: [
                { label: 'DALL·E 3', url: 'https://openai.com/dall-e-3/' },
                { label: 'Midjourney', url: 'https://www.midjourney.com/' },
                { label: 'Canva AI', url: 'https://www.canva.com/ja_jp/ai-image-generator/' },
                { label: 'Adobe Photoshop', url: 'https://www.adobe.com/jp/products/photoshop.html' }
            ]
        },
        {
            keywords: ['動画', 'ムービー', '映像', 'アニメーション', 'AI動画'],
            message: `動画の生成・編集には、以下の外部サイトがおすすめです。`,
            sites: [
                { label: 'Runway Gen-2', url: 'https://research.runwayml.com/gen2' },
                { label: 'Sora', url: 'https://openai.com/sora/' },
                { label: 'Synthesia', url: 'https://www.synthesia.io/' }
            ]
        },
        {
            keywords: ['音声', 'ボイス', 'ナレーション', 'AI音声', '読み上げ'],
            message: `音声の生成・変換には、以下の外部サイトがおすすめです。`,
            sites: [
                { label: 'Coqui', url: 'https://coqui.ai/' },
                { label: 'Amazon Polly', url: 'https://aws.amazon.com/jp/polly/' },
                { label: 'ElevenLabs', url: 'https://elevenlabs.io/' }
            ]
        },
        {
            keywords: ['UI', 'デザイン', 'モックアップ', '画面設計', 'ワイヤーフレーム'],
            message: `UIデザインやモックアップ作成には、以下の外部サイトがおすすめです。`,
            sites: [
                { label: 'Uizard', url: 'https://uizard.io/' },
                { label: 'Canva', url: 'https://www.canva.com/' }
            ]
        },
        {
            keywords: ['資料', '図解', 'プレゼン', 'マインドマップ', 'スライド'],
            message: `図解や資料・プレゼン作成には、以下の外部サイトがおすすめです。`,
            sites: [
                { label: 'Napkin.ai', url: 'https://www.napkin.ai/' },
                { label: 'Canva', url: 'https://www.canva.com/' }
            ]
        },
        {
            keywords: ['プロンプト', 'お題', '指示文', 'AIプロンプト'],
            message: `AI用プロンプトの検索・共有には、以下の外部サイトがおすすめです。`,
            sites: [
                { label: 'SearchPromptly', url: 'https://searchpromptly.com/' }
            ]
        }
    ];
    const defaultMessage = `ご質問内容に応じて、以下のAIサービスもご活用いただけます。`;
    const defaultSites = [
        { label: 'ChatGPT（テキスト生成・質問応答）', url: 'https://chat.openai.com/' },
        { label: 'Gemini（テキスト生成・質問応答）', url: 'https://gemini.google.com/' },
        { label: 'Claude（テキスト生成・質問応答）', url: 'https://claude.ai/' }
    ];

    const sendMessage = async () => {
        const userMessage = chatInput.value.trim();
        if (userMessage === '' || chatInput.disabled) return;
        appendMessage(userMessage, 'user');
        chatInput.value = '';
        appendMessage('...', 'bot', true); // ローディング表示

        // ジャンルごとにおすすめサイトを案内
        let botReply = null;
        let siteList = null;
        for (const rec of recommendSites) {
            if (
                (rec.keywords && rec.keywords.some(kw => userMessage.includes(kw))) ||
                (rec.pattern && rec.pattern.test && rec.pattern.test(userMessage))
            ) {
                botReply = rec.message;
                siteList = rec.sites;
                break;
            }
        }
        if (!botReply) {
            botReply = defaultMessage;
            siteList = defaultSites;
        }

        const thinkingMessage = chatMessages.querySelector('.thinking');
        if (thinkingMessage) {
            thinkingMessage.remove();
        }
        // サイトリストをボタンリストで表示
        appendMessage(botReply + createSiteButtonList(siteList), 'bot', false, true);
    };

    // appendMessageを拡張してHTML挿入対応
    function appendMessage(text, type, isLoading = false, isHtml = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);
        if (isLoading) {
            messageElement.classList.add('thinking');
            messageElement.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
        } else if (isHtml) {
            messageElement.innerHTML = text;
        } else {
            messageElement.textContent = text;
        }
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // プルダウンでサイト遷移
    chatMessages.addEventListener('change', function(e) {
        if (e.target.classList.contains('site-dropdown')) {
            const url = e.target.value;
            if (url) window.open(url, '_blank');
        }
    });

    // チャット送信イベントリスナーを復活
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    initializeChat();
}); 
