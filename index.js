const svgcontainer = document.querySelector(".svgcontainer");
const audioFileInput = document.querySelector(".audiofile");
const audioPlayer = document.querySelector(".player");
audioPlayer.loop = true;
const progressBar = document.querySelector(".processbar");
const process = document.querySelector(".process");
const startTime = document.querySelector(".start");
const endTime = document.querySelector(".end");
const justSvg = document.querySelector(".svg");
const playBtn = document.querySelector(".play");
const pauseBtn = document.querySelector(".pause");
const audioName = document.querySelector(".name");
const leftContent = document.querySelector(".leftcontent");
const lyricsContainer = document.querySelector(".lyricscontainer");
const rightContent = document.querySelector(".rightcontent");
const mainDiv = document.querySelector(".main");
const processedLines = new Set();
let needProcess = undefined;
let width = 1280;
let height = 720;
let called = false;

// 常量
const LINE_HEIGHT = 20;
const LYRICS_OFFSET = window.innerHeight / 3.5;

let lastLyric = -1

let bgImg = new Image();
bgImg.src = "./default.svg";

// 初始状态：无文件输入，收起右侧区域并使左侧内容居中显示默认封面/按钮/标题
document.body.classList.add('no-files');

let playing = false;
let isDragging = false;
let lrcData;
let lyrics = [];
let allTimes = [];
let lyricsElement = document.querySelector(".lyrics");
let reader;
let imageLoaded = false;
let audioLoaded = false;
let lrcLoaded = false;

svgcontainer.addEventListener("click", async () => {
    audioFileInput.click();
});

audioPlayer.addEventListener("loadedmetadata", () => {
    endTime.textContent = `-${formatTime(audioPlayer.duration)}`;
    if (audioLoaded) {
        if (!lrcLoaded) {
            width = 325;
            height = 437;
        }
        playBtn.click();
    } else {
        alert("请选择音频文件");
    }
});

audioFileInput.addEventListener("change", async (event) => {
    const files = event.target.files;
    if (files.length === 0) return;

    // 选择文件后展开右侧并触发左侧非线性移动动画
    requestAnimationFrame(() => {
        document.body.classList.remove('no-files');
    });

    for (const file of files) {
        const fileURL = URL.createObjectURL(file);

        if (file.type.startsWith('image/')) {
            bgImg.src = fileURL;
            imageLoaded = true;
        }

        else if (file.type.startsWith('audio/')) {
            audioPlayer.src = fileURL;
            audioLoaded = true;
            let filename = file.name.replace(/\.[^/.]+$/, "");
            audioName.textContent = filename.length > 30 ? filename.substring(0, 30) + "..." : filename;

            jsmediatags.read(file, {
                onSuccess: function (tag) {
                    const tags = tag.tags;

                    if (tags.picture) {
                        const { data, format } = tags.picture;
                        let base64String = "";
                        for (let i = 0; i < data.length; i++) {
                            base64String += String.fromCharCode(data[i]);
                        }
                        bgImg.src = `data:${format};base64,${window.btoa(base64String)}`;
                        imageLoaded = true;
                    }

                    if (tags.lyrics && tags.lyrics.lyrics) {
                        processLrcText(tags.lyrics.lyrics);
                    }
                },
                onError: function (error) {
                    console.log(error.type, error.info);
                }
            });
        }

        else if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith(".lrc")) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const buffer = e.target.result;
                const decodedText = decodeBuffer(buffer);
                processLrcText(decodedText);
            };
            reader.readAsArrayBuffer(file);
        }
    }
});

function processLrcText(text) {
    enableLyric();
    lrcData = text;
    let parsedData = parseLrc(lrcData);
    lyrics = parsedData.lyrics;
    allTimes = parsedData.allTimes;

    lyricsElement = document.querySelector(".lyrics");
    lyricsElement.innerHTML = "";

    for (let i = 0; i < lyrics.length; i++) {
        lyricsElement.appendChild(lyrics[i].ele);
    }

    UpdateLyricsLayout(0, lyrics, 0);
    for (let i = 0; i < lyrics.length; i++) {
        lyrics[i].ele.style.transition = "all 0.7s cubic-bezier(.19,.11,0,1)";
    }
    lrcLoaded = true;
}

function decodeBuffer(buffer) {
    const encodings = ['utf-8', 'gbk', 'big5', 'shift_jis'];
    for (const encoding of encodings) {
        try {
            const decoder = new TextDecoder(encoding, { fatal: true });
            return decoder.decode(new Uint8Array(buffer));
        } catch (e) { continue; }
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer));
}

function disableLyric() {
    rightContent.style.display = "none";
    leftContent.style.paddingLeft = "none";
}

function enableLyric() {
    rightContent.style.display = "";
    leftContent.style.paddingLeft = "";
}

function fetchLrcFile(filename) {
    return new Promise((resolve, reject) => {
        const lrcFileUrl = `${filename}`;
        fetch(lrcFileUrl)
            .then(response => {
                if (response.ok) {
                    return response.text();
                } else {
                    reject("No such lrc file");
                    disableLyric();
                }
            })
            .then(lrcData => resolve(lrcData))
            .catch(error => reject(error));
    });
}

audioPlayer.addEventListener("timeupdate", () => {
    if (audioPlayer.duration) {
        process.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
        startTime.textContent = formatTime(audioPlayer.currentTime);
        endTime.textContent = `-${formatTime(audioPlayer.duration - audioPlayer.currentTime)}`;
        const cTime = audioPlayer.currentTime;

        let lList = [];
        for (let i = 0; i < lyrics.length; i++) {
            if (cTime >= lyrics[i].time) {
                lList.push(lyrics[i]);
            }
        }
        if (lList.length === 0) return;
        if (lastLyric !== lList.length - 1) {

            UpdateLyricsLayout(lList.length - 1, lyrics, 1);
            console.log(lList[lList.length - 1].text);

            lastLyric = lList.length - 1
        }

    }
});

progressBar.addEventListener("mousedown", (event) => {
    if (Number.isNaN(audioPlayer.duration)) {
        return;
    }
    isDragging = true;
    updateProgress(event);
});

document.addEventListener("mousemove", (event) => {
    if (isDragging) {
        updateProgress(event);
    }
});

document.addEventListener("mouseup", () => {
    isDragging = false;
});

playBtn.addEventListener("click", () => {
    if (Number.isNaN(audioPlayer.duration)) {
        return;
    }
    playing = true;
    audioPlayer.play();
    pauseBtn.style.display = "block";
    playBtn.style.display = "none";
});

pauseBtn.addEventListener("click", () => {
    playing = false;
    audioPlayer.pause();
    pauseBtn.style.display = "none";
    playBtn.style.display = "block";
});

function updateProgress(event) {
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const progressBarWidth = rect.width;
    const percentage = (clickPosition / progressBarWidth) * 100;
    process.style.width = `${percentage}%`;
    audioPlayer.currentTime = (percentage / 100) * audioPlayer.duration;

    if (!playing) {
        playBtn.click();
    }
}

function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function parseLrc(lrcText) {
    const lines = lrcText.trim().split('\n');
    const lrcArray = [];
    const allTimes = [];

    lines.forEach(line => {
        const timeMatch = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/);

        if (timeMatch) {
            const minutes = parseInt(timeMatch[1], 10);
            const seconds = parseInt(timeMatch[2], 10);
            const milliseconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

            const text = line.replace(timeMatch[0], '').trim();

            const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;

            allTimes.push(timeInSeconds);

            const div = document.createElement('div');
            div.className = 'item';
            const p = document.createElement('p');
            p.textContent = text;
            div.appendChild(p);
            if (text) {
                lrcArray.push({ time: timeInSeconds, text, ele: div });
            }
        }
    });

    return {
        lyrics: lrcArray,
        allTimes: allTimes
    };
}

audioPlayer.addEventListener('play', () => {
    //requestAnimationFrame(updateLyrics);
});

function getDominantColors(imageData, colorCount = 4, minColorDistance = 60) {
    const pixels = imageData.data;
    const { width, height } = imageData;
    const regionColors = [];
    const dominantColors = [];

    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);
    const step = 5;

    const regions = [
        { x1: 0, y1: 0, x2: halfWidth, y2: halfHeight },
        { x1: halfWidth, y1: 0, x2: width, y2: halfHeight },
        { x1: 0, y1: halfHeight, x2: halfWidth, y2: height },
        { x1: halfWidth, y1: halfHeight, x2: width, y2: height }
    ];

    regions.forEach(region => {
        let totalR = 0, totalG = 0, totalB = 0, pixelCount = 0;
        for (let y = region.y1; y < region.y2; y += step) {
            for (let x = region.x1; x < region.x2; x += step) {
                const i = (y * width + x) * 4;
                totalR += pixels[i]; totalG += pixels[i + 1]; totalB += pixels[i + 2];
                pixelCount++;
            }
        }
        if (pixelCount > 0) {
            regionColors.push([Math.round(totalR / pixelCount), Math.round(totalG / pixelCount), Math.round(totalB / pixelCount)]);
        }
    });

    regionColors.forEach(([r, g, b]) => {
        const isUnique = dominantColors.every(([er, eg, eb]) => {
            return Math.sqrt((r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2) >= minColorDistance;
        });
        if (isUnique) dominantColors.push([r, g, b]);
    });

    while (dominantColors.length < colorCount) {
        dominantColors.push(dominantColors[dominantColors.length % dominantColors.length] || [128, 128, 128]);
    }

    return dominantColors.map(([r, g, b]) => `rgba(${r},${g},${b},0.8)`);
}

// 定义切片类，处理旋转和绘制 (Made by Gemini)
class Slice {
    constructor(img, index, canvas) {
        this.img = img;
        this.index = index; // 0, 1, 2, 3 对应四个象限
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // 随机初始角度和旋转速度
        this.angle = Math.random() * Math.PI * 2;
        this.velocity = (Math.random() - 0.5) * 0.005; // 旋转速度，控制流动的快慢

        // 放大倍数，确保旋转时不会露出切片边缘
        this.scale = 1.2;
    }

    update() {
        this.angle += this.velocity;
    }

    draw() {
        const { width, height } = this.canvas;
        const ctx = this.ctx;

        // 计算当前切片在画布上的中心点 (2x2 布局)
        const centerX = (this.index % 2 === 0) ? width * 0.25 : width * 0.75;
        const centerY = (this.index < 2) ? height * 0.25 : height * 0.75;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.angle);
        ctx.scale(this.scale, this.scale);

        // 从原图中裁切对应的 1/4 区域
        const sw = this.img.width / 2;
        const sh = this.img.height / 2;
        const sx = (this.index % 2) * sw;
        const sy = Math.floor(this.index / 2) * sh;

        // 绘制到画布上，适当偏移中心以重叠融合
        const drawSize = Math.max(width, height) * 0.6;
        ctx.globalAlpha = 0.7; // 增加透明度让颜色叠加更柔和
        ctx.drawImage(this.img, sx, sy, sw, sh, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
    }
}

let animationId = null;
let slices = [];

bgImg.onload = () => {
    if (typeof justSvg !== 'undefined') justSvg.style.display = "none";
    svgcontainer.style.background = `url(${bgImg.src})`;
    svgcontainer.style.backgroundSize = "cover";
    svgcontainer.style.backgroundPosition = "center";

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = 100;
    tempCanvas.height = 100 * (bgImg.height / bgImg.width);
    tempCtx.drawImage(bgImg, 0, 0, tempCanvas.width, tempCanvas.height);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    let colors = getDominantColors(imageData);
    colors.forEach((col, i) => {
        document.body.style.setProperty(`--color${i + 1}`, col);
        document.body.style.setProperty(`--color${i + 1}-rgba`, col.replace("0.9", "0.3"));
    });

    const fluidCanvas = document.querySelector("canvas.canvas");
    const fCtx = fluidCanvas.getContext('2d');

    const resize = () => {
        fluidCanvas.width = window.innerWidth;
        fluidCanvas.height = window.innerHeight;
    };
    window.onresize = resize;
    resize();

    slices = [0, 1, 2, 3].map(i => new Slice(bgImg, i, fluidCanvas));

    if (animationId) cancelAnimationFrame(animationId);

    function animate() {
        fCtx.clearRect(0, 0, fluidCanvas.width, fluidCanvas.height);
        fCtx.globalCompositeOperation = 'screen';

        slices.forEach(slice => {
            slice.update();
            slice.draw();
        });

        animationId = requestAnimationFrame(animate);
    }

    animate();
};



// 动态计算布局的函数
function GetLyricsLayout(now, to, data) {
    let res = 0;
    // 判断滚动方向
    if (to > now) { // 向下滚动
        for (let i = now; i < to; i++) {
            res += data[i].ele.offsetHeight + LINE_HEIGHT;
        }
    } else { // 向上滚动
        for (let i = now; i > to; i--) {
            res -= data[i - 1].ele.offsetHeight + LINE_HEIGHT;
        }
    }

    // 使用偏移值作为初始位置，确保歌词居中或位于正确位置
    return res + LYRICS_OFFSET;
}

function UpdateLyricsLayout(index, data, init = 1) {

    for (let i = 0; i < data.length; i++) {

        if (i === index && init) {
            data[i].ele.style.color = "rgba(255,255,255,1)"

        } else {
            data[i].ele.style.color = "rgba(255,255,255,0.2)"
        }
        data[i].ele.style.filter = `blur(${Math.abs(i - index)}px)`
        const position = GetLyricsLayout(index, i, data);

        let n = (i - index) + 1
        if (n > 10) {
            n = 0
        }
        setTimeout(() => {
            data[i].ele.style.transform = `translateY(${position}px)`;
        }, (n * 70 - n * 10) * init);
    }
}

// 搜索框功能
const searchContainer = document.getElementById('search_container');
const searchTrigger = document.getElementById('search_trigger');
const searchDropdown = document.getElementById('search_dropdown');
const searchInput = document.getElementById('search_input');
const searchResults = document.getElementById('search_results');

let searchKeyword = '';          
let searchResultList = [];       

// 点击触发器切换显示
searchTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    searchDropdown.classList.toggle('hidden');
});

// 点击其他区域关闭
document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
        searchDropdown.classList.add('hidden');
    }
});


searchDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
});

// ESC 键关闭
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        searchDropdown.classList.add('hidden');
    }
});

// 输入防抖
let searchTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const keyword = e.target.value.trim();
    if (keyword === '') {
        searchResults.innerHTML = '';
        return;
    }
    searchTimer = setTimeout(() => {
        performSearch(keyword);
    }, 400);
});

// 执行搜索
async function performSearch(keyword) {
    searchKeyword = keyword;
    searchResults.innerHTML = '<div class="search-loading">搜索中...</div>';
    try {
        const url = `https://oiapi.net/api/Kuwo?msg=${encodeURIComponent(keyword)}&limit=10`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 1 && data.data && data.data.length > 0) {
            searchResultList = data.data;
            renderSearchResults(data.data);
        } else {
            searchResults.innerHTML = '<div class="search-no-result">未找到相关歌曲</div>';
        }
    } catch (err) {
        console.error('搜索失败', err);
        searchResults.innerHTML = '<div class="search-error">搜索出错，请重试</div>';
    }
}


function renderSearchResults(results) {
    let html = '';
    results.forEach((item, index) => {
        html += `
            <div class="search-result-item" data-index="${index}">
                <span class="song-name">${escapeHtml(item.song)}</span>
                <span class="artist-name">${escapeHtml(item.singer)}</span>
            </div>
        `;
    });
    searchResults.innerHTML = html;

    // 点击事件
    document.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.index;
            playSelectedSong(index);
        });
    });
}

// XSS
function escapeHtml(unsafe) {
    return unsafe.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

// 播放歌曲
async function playSelectedSong(index) {
    const item = searchResultList[index];
    if (!item) return;

    // 加载状态
    audioName.textContent = `加载中...`;

    try {
        // 获取歌曲详细
        // 使用原始关键词 + n 参数获取该歌曲的详细信息
        const detailUrl = `https://oiapi.net/api/Kuwo?msg=${encodeURIComponent(searchKeyword)}&n=${Number(index)+1}`;
        const detailRes = await fetch(detailUrl);
        const detailData = await detailRes.json();

        // 提取url
        let audioUrl = '';
        if (detailData.code === 1) {
            if (Array.isArray(detailData.data)) {
                audioUrl = detailData.data[0]?.url;
            } else if (typeof detailData.data === 'object') {
                audioUrl = detailData.data?.url;
            }
        }

        if (!audioUrl) {
            throw new Error('无法获取播放链接');
        }

       
        audioPlayer.src = audioUrl;
        audioLoaded = true;

        // 更新封面
        if (item.picture && item.picture !== 'https://h5s.kuwo.cn/www/kw-www/img/logo.ce08bf7.png') {
            bgImg.src = item.picture;
        } else {
            // 默认背景
            bgImg.src = './default.svg';
        }

        // 更新歌曲名显示
        let displayName = item.song;
        if (item.singer) displayName += ` - ${item.singer}`;
        audioName.textContent = displayName.length > 40 ? displayName.substring(0, 40) + '...' : displayName;

        // 获取歌词
        fetchLyricBySongName(item.song, item.singer).then(lyric => {
            if (lyric) {
                processLrcText(lyric);
            } else {
                // 无歌词时清空显示
                lyricsElement.innerHTML = '';
                lrcLoaded = false;
                disableLyric();
            }
        }).catch(() => {
            disableLyric();
        });

        // 自动播放
        setTimeout(() => {
            if (audioPlayer.readyState >= 2) {
                playBtn.click();
            }
        }, 500);

    } catch (err) {
        console.error('播放失败', err);
        alert('无法加载歌曲，请稍后重试');
    }
}

// 歌词API,QQ音乐源
const API_BASE = 'https://api.wuhy.de5.net';

async function searchSongmid(keyword) {
    const url = `${API_BASE}/getSearchByKey?key=${encodeURIComponent(keyword)}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();
    const songList = data?.response?.data?.song?.list;
    if (songList && songList.length > 0) {
        return songList[0].songmid;
    }
    return null;
}

async function getLyric(songmid) {
    const url = `${API_BASE}/getLyric?songmid=${encodeURIComponent(songmid)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data?.response?.lyric || '';
}

async function fetchLyricBySongName(title, artist) {
    const keyword = `${title} ${artist}`;
    const songmid = await searchSongmid(keyword);
    if (!songmid) {
        console.warn('未找到歌词');
        return '';
    }
    const lyric = await getLyric(songmid);
    return lyric;
}