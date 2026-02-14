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
/*
function mainDivScalePosition(width, height) {
    // width: 1280, height: 720 (Image loaded)
    // width: 325, height: 437 (Image unloaded)
    const scaleX = mainDiv.clientWidth / width;
    const scaleY = mainDiv.clientHeight / height;
    const scale = Math.max(scaleX, scaleY);

    mainDiv.style.transform = `scale(${scale})`;
    mainDiv.style.top = `calc(50% - ${mainDiv.clientHeight / 2}px)`;
    mainDiv.style.left = `calc(50% - ${mainDiv.clientWidth / 2}px)`;

    rightContent.style.paddingLeft = `${10 / scaleX}%`;
}

window.addEventListener("resize", () => {
    mainDivScalePosition(width, height);
});
mainDivScalePosition(width, height);
*/
let bgImg = new Image();
bgImg.src = "./default.svg";
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
    // const filePaths = await window.electron.openDialog();
    // if (filePaths && filePaths.length > 0) {
    //     // 处理选中的文件
    //     for (const filePath of filePaths) {
    //         const file = new File([await fetch(filePath).then(r => r.blob())], filePath.split('/').pop());
    //         const event = { target: { files: [file] } };
    //         audioFileInput.dispatchEvent(new CustomEvent('change', { detail: event }));
    //     }
    // }
    audioFileInput.click();
});

audioPlayer.addEventListener("loadedmetadata", () => {
    endTime.textContent = `-${formatTime(audioPlayer.duration)}`;
    // if (imageLoaded && audioLoaded && lrcLoaded) {
    //     setTimeout(() => {
    //         playBtn.click();
    //     }, 100);
    // } else if (!lrcLoaded && imageLoaded && audioLoaded) {
    //     window.dispatchEvent(new Event("resize"));
    //     setTimeout(() => {
    //         playBtn.click();
    //     }, 100);
    // }
    if (audioLoaded) {
        if (!lrcLoaded) {
            width = 325;
            height = 437;
            // window.dispatchEvent(new Event("resize"));
            // mainDiv.style.marginLeft = "0";
        }
        playBtn.click();
    } else {
        alert("请选择音频文件");
    }
});

audioFileInput.addEventListener("change", async (event) => {
    const files = event.target.files;
    if (files.length === 0) return;

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
        // 歌词触发计算
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

    //mainDivScalePosition(width, height);

    return {
        lyrics: lrcArray,
        allTimes: allTimes
    };
}
/*
function updateLyrics() {
    if (!playing) return;

    const currentTime = audioPlayer.currentTime;
    const lyricLines = lyricsElement.querySelectorAll('*');
    if (called) {
        lyricsElement.style.transition = "all 1s cubic-bezier(0.25, 0.8, 0.25, 1)";
    } else {
        centerActiveLine(lyricLines[0]);
    }
    let activeIndex = -1;

    for (let i = 0; i < lyrics.length; i++) {
        if (currentTime >= lyrics[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }

    lyricLines.forEach((line, index) => {
        const distance = Math.abs(activeIndex - index);
        const thisTime = allTimes[activeIndex];

        if (distance > 8) {
            line.style.visibility = "hidden";
            return;
        }

        if (index === activeIndex) {
            applyActiveLineStyle(line, index, lyricLines, thisTime);
        } else {
            applyNearbyLineStyle(line, distance);
        }
    });

    if (activeIndex >= 0) {
        requestAnimationFrame(() => {
            setTimeout(() => {
                centerActiveLine(lyricLines[activeIndex]);
            }, 120);
        });
    }

    requestAnimationFrame(updateLyrics);
}

function applyActiveLineStyle(line, index, allLines, thisTime) {
    void line.offsetWidth;
    setTimeout(() => {
        line.classList.add("highlight");
        line.style.filter = "none";
        line.style.marginLeft = "0";
        line.style.visibility = "visible";
        line.style.opacity = "0.6";
        line.style.setProperty("--type-time", `${thisTime / 2}s`);
    }, 300);

    if (!processedLines.has(index)) {
        processedLines.add(index);

        const start = Math.max(0, index - 3);
        const end = Math.min(allLines.length - 1, index + 3);
        const displayingLines = Array.from(allLines).slice(start, end + 1);

        displayingLines.forEach((nline, i) => {
            setTimeout(() => {
                nline.style.marginTop = `${line.clientHeight}px`;

                setTimeout(() => {
                    nline.style.marginTop = "4%";
                }, 250);
            }, i * 75);
        });
    }
}

function applyNearbyLineStyle(line, distance) {
    void line.offsetWidth;
    line.classList.remove("highlight");
    line.style.filter = `blur(${distance * 0.5}px)`;
    line.style.marginLeft = `${distance * 1.25}px`;
    line.style.opacity = `${0.3 - distance / 100}`;
    line.style.visibility = "visible";
}

function centerActiveLine(activeLine) {
    if (!activeLine) return;
    if (!called) called = true;

    const container = document.querySelector(".lyricscontainer");
    const containerHeight = container.clientHeight;
    const activeLineOffset = activeLine.offsetTop;
    const offset = (containerHeight / 2) - activeLineOffset - (0.1 * containerHeight);

    lyricsElement.style.transform = `translateY(${offset}px)`;
}
*/
audioPlayer.addEventListener('play', () => {
    //requestAnimationFrame(updateLyrics);
});
/*
window.addEventListener('resize', () => {
    lyricsElement.classList.add("noTransition");
    updateLyrics();
    lyricsElement.classList.remove("noTransition");
});

updateLyrics();
*/
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

// 新增的函数

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
