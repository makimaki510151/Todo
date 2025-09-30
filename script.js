const player = document.getElementById('player');
const gameContainer = document.getElementById('game-container');
const timerDisplay = document.getElementById('timer');
const gameOverDisplay = document.getElementById('game-over');
const promptMessage = document.getElementById('prompt-message');

// 🌟削除: モバイル操作UIの要素を取得する行を削除🌟
// const leftButton = document.getElementById('left-button');
// const rightButton = document.getElementById('right-button');
// const jumpButton = document.getElementById('jump-button');
// 🌟削除 終わり🌟

// プレイヤーの初期位置を空中（中央上部）に設定
// 🌟修正: 初期位置を画面中央付近に変更🌟
let playerX = gameContainer.offsetWidth / 2;
let playerY = gameContainer.offsetHeight / 2;
let isJumping = false;
let velocityY = 0;
const gravity = -1.5; // 🌟重力はそのまま維持🌟
const jumpStrength = 14;

// プレイヤーの速度を管理する変数
let velocityX = 0;
const maxMoveSpeed = 10;
const moveAcceleration = 2.0;
const moveDeceleration = 0.85;
const airControl = 0.7;

// 衝突時の反発力
const horizontalBounceStrength = 120; // 左右の弾き力 (元より弱めに設定)
const verticalBounceStrength = 20;

// 🌟修正: jumpCountを削除し、無限ジャンプを可能にする🌟
// let jumpCount = 0;

const keys = {};
let jumpKeyHeld = false;
let gamepad = null;

const animationSpeed = 0.2;
player.style.animationDuration = `${animationSpeed}s`;

let gameOver = false;
let gameStarted = false;
let startTime = 0;
let lastBulletSpawnTime = 0;

const initialSpawnRate = 1000;
let currentSpawnRate = initialSpawnRate;
let bulletsPerInterval = 1;
let currentBulletSpeed = 5;
let lastDifficultyIncreaseTime = 0;
let lastSpeedIncreaseTime = 0;

let gameLoopId = null;

const fps = 100;
const interval = 1000 / fps;
let lastTime = 0;


// メッセージの位置をプレイヤーの近くに更新する関数
function updatePromptPosition() {
    if (promptMessage && player) {
        const playerWidth = player.offsetWidth;
        const playerHeight = player.offsetHeight;

        const messageLeft = playerX + playerWidth / 2 - promptMessage.offsetWidth / 2;
        const messageBottom = playerY + playerHeight + 10;

        promptMessage.style.left = `${messageLeft}px`;
        promptMessage.style.bottom = `${messageBottom}px`;
    }
}


// ゲームの状態をリセットする関数
function resetGame() {
    cancelAnimationFrame(gameLoopId);

    gameOver = false;
    gameStarted = false;
    startTime = 0;
    lastBulletSpawnTime = 0;
    currentSpawnRate = initialSpawnRate;
    bulletsPerInterval = 1;
    currentBulletSpeed = 5;
    lastDifficultyIncreaseTime = 0;
    lastSpeedIncreaseTime = 0;

    // プレイヤーの位置をリセット
    // 🌟修正: 初期位置を画面中央付近に変更🌟
    playerX = gameContainer.offsetWidth / 2;
    playerY = gameContainer.offsetHeight / 2;
    isJumping = false;
    velocityY = 0;
    velocityX = 0;
    // 🌟修正: jumpCountを削除🌟
    player.style.left = `${playerX}px`;
    player.style.bottom = `${playerY}px`;

    player.classList.remove('walking');
    player.classList.add('idle');

    const bullets = document.querySelectorAll('.bullet');
    bullets.forEach(bullet => bullet.remove());

    gameOverDisplay.style.display = 'none';
    timerDisplay.textContent = '時間: 0分 0秒';

    if (promptMessage) {
        promptMessage.style.display = 'block';
    }

    updatePromptPosition();
}


// キーが押された状態を記録 (PCキーボードのみ)
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    if (e.key === ' ') {
        // 🌟修正: 無限ジャンプに戻すため、jumpCountのチェックを削除🌟
        if (!jumpKeyHeld) {
            isJumping = true;
            velocityY = jumpStrength;

            // ジャンプ開始時のみゲーム開始
            if (!gameStarted) {
                startGame();
            }
        }
        jumpKeyHeld = true;
    }

    if (gameOver && e.key === 'Enter') {
        resetGame();
        gameLoop();
    }
});

// ゲーム開始処理を関数化
function startGame() {
    gameStarted = true;
    startTime = Date.now();
    lastBulletSpawnTime = startTime;
    lastDifficultyIncreaseTime = startTime;
    lastSpeedIncreaseTime = startTime;

    if (promptMessage) {
        promptMessage.style.display = 'none';
    }
}

// キーが離された状態を記録 (PCキーボードのみ)
document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key === ' ') {
        jumpKeyHeld = false;
    }
});


// 🌟削除: モバイル操作イベントリスナーの修正 (setupMobileControl関数と呼び出し)を削除🌟


// ゲームコントローラー関連のコード... (そのまま維持)

window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected!');
    gamepad = e.gamepad;
});

window.addEventListener('gamepaddisconnected', (e) => {
    console.log('Gamepad disconnected!');
    gamepad = null;
});

// 弾を生成する関数 (変更なし)
function createBullet() {
    if (gameOver) return;

    const bullet = document.createElement('div');

    bullet.classList.add('bullet');

    const spawnSide = Math.floor(Math.random() * 3);
    let startX, startY;

    const playerRect = player.getBoundingClientRect();
    const gameContainerRect = gameContainer.getBoundingClientRect();
    const playerCenterX = playerRect.left + playerRect.width / 2 - gameContainerRect.left;
    const playerCenterY = playerY + player.offsetHeight / 2;

    if (spawnSide === 0) { // 上から
        startX = Math.random() * gameContainer.offsetWidth;
        startY = gameContainer.offsetHeight + 20;
    } else if (spawnSide === 1) { // 左から
        startX = -20;
        startY = Math.random() * gameContainer.offsetHeight;
    } else { // 右から
        startX = gameContainer.offsetWidth + 20;
        startY = Math.random() * gameContainer.offsetHeight;
    }

    const dx = playerCenterX - startX;
    const dy = playerCenterY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const vx = (dx / distance) * currentBulletSpeed;
    const vy = (dy / distance) * currentBulletSpeed;

    bullet.style.left = `${startX}px`;
    bullet.style.bottom = `${startY}px`;
    bullet.velocity = { x: vx, y: vy };

    gameContainer.appendChild(bullet);
}

// 衝突判定 (変更なし)
function checkCollision(bullet) {
    const playerRect = player.getBoundingClientRect();
    const bulletRect = bullet.getBoundingClientRect();

    const collisionOffset = 5;

    if (
        playerRect.left + collisionOffset < bulletRect.right &&
        playerRect.right - collisionOffset > bulletRect.left &&
        playerRect.top + collisionOffset < bulletRect.bottom &&
        playerRect.bottom - collisionOffset > bulletRect.top
    ) {
        return true;
    }
    return false;
}

function updatePlayerPosition() {

    if (gameOver) return;

    // ゲーム未開始時の処理
    if (!gameStarted) {
        let horizontalInput = 0;
        let jumpButtonPushed = false;

        // キーボード入力 (A, Dキー)
        if (keys['a'] || keys['d']) {
            horizontalInput = keys['d'] ? 1 : -1;
        }

        // ゲームコントローラー入力
        if (gamepad) {
            gamepad = navigator.getGamepads()[gamepad.index];
            if (Math.abs(gamepad.axes[0]) > 0.1) {
                horizontalInput = gamepad.axes[0];
            }
            // コントローラAボタン (buttons[0]) の処理
            if (gamepad.buttons[0].pressed && !jumpKeyHeld) {
                jumpButtonPushed = true;
            } else if (!gamepad.buttons[0].pressed) {
                jumpKeyHeld = false;
            }
        }

        // スペースキーまたはコントローラAボタンが押されている
        if (keys[' '] && !jumpKeyHeld) {
            jumpButtonPushed = true;
        }
        
        // 🌟修正: 無限ジャンプに戻すため、jumpCountのチェックを削除🌟
        if (jumpButtonPushed) {
            isJumping = true;
            velocityY = jumpStrength;
            startGame();
            jumpKeyHeld = true; // キーボード/コントローラでの再ジャンプ防止
        }

        playerX += horizontalInput * 0.5;
        velocityX = 0;

        // 画面端の壁判定（ゲーム未開始時のみ）
        playerX = Math.max(0, Math.min(playerX, gameContainer.offsetWidth - player.offsetWidth));

        player.style.left = `${playerX}px`;
        player.style.bottom = `${playerY}px`;
        updatePromptPosition();
        return;
    }


    // ゲーム開始後の処理

    let horizontalInput = 0;
    let acceleration = moveAcceleration;

    acceleration *= airControl;

    // キーボード入力 (keys['a']とkeys['d']の同時押しは相殺される)
    if (keys['a']) {
        horizontalInput = -1;
    }
    if (keys['d']) {
        horizontalInput = 1;
    }
    // 両方押されている場合は0になる

    // ゲームコントローラーからの入力
    if (gamepad) {
        gamepad = navigator.getGamepads()[gamepad.index];
        const joystickX = gamepad.axes[0];
        if (Math.abs(joystickX) > 0.1) {
            horizontalInput = joystickX;
        }

        // コントローラAボタンでのジャンプ処理
        // 🌟修正: 無限ジャンプに戻すため、jumpCountのチェックを削除🌟
        if (gamepad.buttons[0].pressed && !jumpKeyHeld) {
            isJumping = true;
            velocityY = jumpStrength;
            jumpKeyHeld = true;
        } else if (!gamepad.buttons[0].pressed) {
            jumpKeyHeld = false;
        }
    }
    
    // 移動ロジック
    if (horizontalInput !== 0) {
        velocityX += horizontalInput * acceleration;
        if (Math.abs(velocityX) > maxMoveSpeed) {
            velocityX = Math.sign(velocityX) * maxMoveSpeed;
        }
    } else {
        // キーが押されていない場合、慣性を減衰 (摩擦)
        velocityX *= moveDeceleration;
        if (Math.abs(velocityX) < 0.1) {
            velocityX = 0;
        }
    }


    playerX += velocityX;

    // キャラクターのアニメーションと向き
    if (velocityX < 0) {
        player.style.transform = 'scaleX(-1)';
    } else if (velocityX > 0) {
        player.style.transform = 'scaleX(1)';
    }

    if (Math.abs(velocityX) > 0.1) {
        player.classList.add('walking');
        player.classList.remove('idle');
    } else {
        player.classList.add('idle');
        player.classList.remove('walking');
    }

    // 画面外に出たかどうかの判定 (ゲームオーバー)
    if (playerX < -player.offsetWidth ||
        playerX > gameContainer.offsetWidth ||
        playerY < -player.offsetHeight ||
        playerY > gameContainer.offsetHeight
    ) {
        gameOver = true;
        gameOverDisplay.style.display = 'block';

        const retryButton = document.getElementById('retry-button');
        if (retryButton) {
            // 🌟修正: PC専用にするため、onclickイベントは削除。Enter/Xボタンでのリトライのみ対応。
            retryButton.onclick = null;
        }
        return;
    }

    player.style.left = `${playerX}px`;
    player.style.bottom = `${playerY}px`;
}

function gameLoop(timestamp) {
    // 🌟削除: 縦画面チェックのロジックを全て削除🌟
    /*
    const orientationMessage = document.getElementById('orientation-message');
    const mobileControls = document.querySelector('.mobile-controls');

    if (window.matchMedia("(orientation: portrait)").matches) {
        orientationMessage.style.display = 'block';
        gameContainer.style.display = 'none';
        if (mobileControls) mobileControls.style.display = 'none';
    } else {
        orientationMessage.style.display = 'none';
        gameContainer.style.display = 'block';
        if (mobileControls) mobileControls.style.display = 'flex';
    }
    */


    // フレームレート制御
    if (timestamp < lastTime + interval) {
        gameLoopId = requestAnimationFrame(gameLoop);
        return;
    }
    lastTime = timestamp;

    if (gameOver) {
        if (gamepad) {
            gamepad = navigator.getGamepads()[gamepad.index];
            // コントローラXボタン (buttons[2]) でリトライ
            if (gamepad.buttons[2].pressed) {
                resetGame();
                gameLoopId = requestAnimationFrame(gameLoop);
                return;
            }
        }
        gameLoopId = requestAnimationFrame(gameLoop);
        return;
    }

    // ゲームが開始されている場合のみ、物理演算、タイマー、弾の処理を行う
    if (gameStarted) {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        timerDisplay.textContent = `時間: ${minutes}分 ${seconds}秒`;

        // 難易度調整のロジック
        if (elapsedTime > 0 && elapsedTime % 5 === 0) {
            if (elapsedTime !== lastDifficultyIncreaseTime) {
                bulletsPerInterval += 3;
                lastDifficultyIncreaseTime = elapsedTime;
            }
        }
        if (elapsedTime > 0 && elapsedTime % 15 === 0) {
            if (elapsedTime !== lastSpeedIncreaseTime) {
                currentBulletSpeed += 1;
                lastSpeedIncreaseTime = elapsedTime;
            }
        }

        // 弾の生成
        if (Date.now() - lastBulletSpawnTime >= currentSpawnRate) {
            for (let i = 0; i < bulletsPerInterval; i++) {
                createBullet();
            }
            lastBulletSpawnTime = Date.now();
        }

        // プレイヤーの重力とジャンプの処理
        playerY += velocityY;
        velocityY += gravity;

        // 🌟修正: 地面への接触判定とジャンプ回数のリセットを削除 (無限ジャンプ/地面なし)🌟
        // if (playerY <= 0) {
        //     playerY = 0;
        //     velocityY = 0;
        //     jumpCount = 0; 
        //     isJumping = false;
        // }

        // 弾の移動と衝突判定
        const bullets = document.querySelectorAll('.bullet');
        bullets.forEach(bullet => {
            let currentX = parseFloat(bullet.style.left);
            let currentY = parseFloat(bullet.style.bottom);

            bullet.style.left = `${currentX + bullet.velocity.x}px`;
            bullet.style.bottom = `${currentY + bullet.velocity.y}px`;

            if (currentX < -30 || currentX > gameContainer.offsetWidth + 30 || currentY < -30 || currentY > gameContainer.offsetHeight + 30) {
                bullet.remove();
            }

            if (checkCollision(bullet)) {
                // 衝突時の反発ロジック
                const playerRect = player.getBoundingClientRect();
                const bulletRect = bullet.getBoundingClientRect();

                const playerCenterX = playerRect.left + playerRect.width / 2 - gameContainer.getBoundingClientRect().left;
                const playerCenterY = playerY + player.offsetHeight / 2;

                const bulletCenterX = bulletRect.left + bulletRect.width / 2 - gameContainer.getBoundingClientRect().left;
                const bulletCenterY = parseFloat(bullet.style.bottom) + bulletRect.height / 2;

                const dx = playerCenterX - bulletCenterX;
                const dy = playerCenterY - bulletCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0) {
                    const normalizedX = dx / distance;
                    const normalizedY = dy / distance;

                    // 左右はhorizontalBounceStrength、上下はverticalBounceStrengthを使用
                    velocityX = normalizedX * horizontalBounceStrength;
                    velocityY = normalizedY * verticalBounceStrength;

                    isJumping = true;
                    // 🌟修正: jumpCountを削除🌟

                    bullet.remove();
                }
            }
        });
    }

    updatePlayerPosition();

    gameLoopId = requestAnimationFrame(gameLoop);
}

player.style.left = `${playerX}px`;
player.style.bottom = `${playerY}px`;
resetGame();
gameLoop();