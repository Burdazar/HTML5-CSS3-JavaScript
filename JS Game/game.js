const canvas = document.querySelector("canvas")
const c = canvas.getContext("2d")

canvas.width = window.innerWidth - 2;
canvas.height = window.innerHeight - 2;

let powerupInterval = null
let shootingInvaderInterval = null
let chasingInvaderInterval = null

let gameGoingOn = false
let response
let data


async function loadData() {
    response = await fetch('./player.json')
    data = await response.json()
}

loadData()


let powerup
const powerups = []
const powerupFlags = {
    beerPowerdown: false,       // beer — doppelt so viel Enemies
    shieldPowerup: false,       // shield — doppelt so wenig Damage von Enemies
    potionPowerdown: false,     // potion — Zeitinterval zwischen Players Projectilen größer
    lightningPowerup: false,    // lightning — geschwindigkeit von Projectiles / anderes Icon
    pentagramPowerup: false     // pentagram — stabile Projectiles
    // ice — +Leben
}

class Powerup {
    constructor({ position, powerupIndex }) {
        this.width = data.Powerup.width
        this.height = data.Powerup.height
        this.position = {
            x: position.x,
            y: position.y
        }
        this.image = new Image()
        this.image.src = data.powerupIconList[powerupIndex]
        this.type = data.powerupTypeList[powerupIndex]
    }

    draw() {
        if (this.image && this.image.complete) {
            c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height)
        }
    }
}

let setPowerupPosition = function (powerupWidth, powerupHeight) {
    let randomX = Math.floor(Math.random() * (canvas.width - powerupWidth * 6)) + powerupWidth * 3
    let randomY = Math.floor(Math.random() * (canvas.height - powerupHeight * 6)) + powerupWidth * 3
    let position = {
        x: randomX,
        y: randomY
    }
    return position
}

let setPowerupIndex = function () {
    let poverupIndex = Math.floor(Math.random() * 6)
    return poverupIndex
}

function initPowerup() {
    powerup = new Powerup({ position: setPowerupPosition(data.Powerup.width, data.Powerup.height), powerupIndex: setPowerupIndex() })
    powerups.push(powerup)
}


const playerProjectiles = []
const invaderProjectiles = []
let projectile

class Projectile {
    constructor({ position, velocity, imageSource }) {
        this.radius = data.Projectile.radius
        this.position = {
            x: position.x,
            y: position.y
        }
        this.velocity = velocity
        this.image = new Image()
        this.image.src = imageSource
    }

    draw() {
        if (this.image && this.image.complete) {
            c.save(); // alle Eigenschaften von Canvas speichern
            c.beginPath();
            c.arc(this.position.x + this.radius, this.position.y + this.radius, this.radius, 0, Math.PI * 2);
            c.clip(); // aus dem Kreis eine Schablone machen und auf das kommende Bild anwenden
            c.drawImage(this.image, this.position.x, this.position.y, this.radius * 2, this.radius * 2);
            c.restore(); // alle gespeicherte Eigenschaften von Canvas wiederherstellen (Kreisschablone wird entfernt)
        }
    }

    update() {
        // Bewegung selbst
        this.position.x += this.velocity.x
        this.position.y += this.velocity.y
        this.draw()
    }
}


let player
let playerAbleToShoot = true
const keyPressed = {
    a: false,
    d: false,
    w: false,
    s: false,
    space: false
}
const mousePosition = {
    x: 0,
    y: 0
}

class Player {
    constructor() {
        this.width = data.Player.width
        this.height = data.Player.height
        this.position = {
            x: canvas.width / 2 - this.width / 2,
            y: canvas.height - this.height              // in der Mitte spawnen:  canvas.height / 2 - this.height / 2
        } // Bei Änderung der Position diese auch in startButton.EventListener ändern
        this.velocity = {
            x: 0,
            y: 0
        }
        this.image = new Image()
        this.image.src = data.Player.imageSource
    }

    draw() {
        if (this.image && this.image.complete) {
            c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height)
        }
    }

    update() {
        // Logik der Bewegung bezüglich x
        if (keyPressed.a && keyPressed.d) {
            this.velocity.x = 0
        }
        else if (keyPressed.a && this.position.x > 0) {
            this.velocity.x = -5
        }
        else if (keyPressed.d && this.position.x < canvas.width - this.width) {
            this.velocity.x = 5
        }
        else {
            this.velocity.x = 0
        }

        // Logik der Bewegung bezüglich y 
        if (keyPressed.w && keyPressed.s) {
            this.velocity.y = 0
        }
        else if (keyPressed.w && this.position.y > 0) {
            this.velocity.y = -5
        }
        else if (keyPressed.s && this.position.y < canvas.height - this.height) {
            this.velocity.y = 5
        }
        else {
            this.velocity.y = 0
        }

        // Bewegung selbst
        this.position.x += this.velocity.x
        this.position.y += this.velocity.y
        this.draw()
    }
}

function playerShooting() {
    if (playerAbleToShoot && keyPressed.space) {
        // wohin wird geschossen (welche Winkel)
        let anglePlayerMouse = Math.atan2(mousePosition.y - (player.position.y + (player.height / 2)), mousePosition.x - (player.position.x + (player.width / 2)))

        const position = {
            x: player.position.x + (player.width / 2),
            y: player.position.y + (player.height / 2)
        }
        const playerBulletSpeed = (powerupFlags.lightningPowerup) ? (data.Player.bulletSpeed * 3) : data.Player.bulletSpeed
        const velocity = {
            x: Math.cos(anglePlayerMouse) * playerBulletSpeed,
            y: Math.sin(anglePlayerMouse) * playerBulletSpeed
        }
        const imageSource = (powerupFlags.pentagramPowerup) ? data.Player.pentagramBulletImageSource : (powerupFlags.lightningPowerup) ? data.Player.lightningBulletImageSource : data.Player.fireBulletImageSource

        projectile = new Projectile({
            position: position,
            velocity: velocity,
            imageSource: imageSource
        })
        playerProjectiles.push(projectile)

        playerAbleToShoot = false
        if (!powerupFlags.potionPowerdown) {
            setTimeout(() => { playerAbleToShoot = true }, 200)
        }
        else {
            setTimeout(() => { playerAbleToShoot = true }, 600)
        }
    }
}


const invaders = []
let shootingInvader

class ShootingInvader {
    constructor({ position }) {
        this.width = data.ShootingInvader.width
        this.height = data.ShootingInvader.height
        this.position = position
        this.velocity = {
            x: 0,
            y: 0
        }
        this.image = new Image()
        this.image.src = data.ShootingInvader.imageSource
        this.positioningPropertiesSet = false
        this.positioningState = true
        /*true — positioning — Statrzustand, auf position gehen
          false — shooting — stehen bleiben und schießen*/
        this.invaderAbleToShoot = false
    }

    draw() {
        if (this.image && this.image.complete) {
            c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height)
        }
    }

    update() {
        // Logik der Positionierung
        if (!this.positioningPropertiesSet) { // wird nur einmal aufgerufen
            setTimeout(() => { this.positioningState = false }, 800) // wann die Bewegung aufhört
            setTimeout(() => { this.invaderAbleToShoot = true }, 1500) // wann erstes Mal geschossen wird

            if (this.position.x < 0) {
                this.velocity = { x: 2, y: 0 }
            }
            else if (this.position.x > (canvas.width - this.width)) {
                this.velocity = { x: -2, y: 0 }
            }
            else if (this.position.y < 0) {
                this.velocity = { x: 0, y: 2 }
            }
            else if (this.position.y > (canvas.height - this.height)) {
                this.velocity = { x: 0, y: -2 }
            }
            this.positioningPropertiesSet = true
        }

        if (this.positioningState) {
            // Bewegung bei der Positionierung
            this.position.x += this.velocity.x
            this.position.y += this.velocity.y
        }
        // Nach der Positionierung stehen bleiben

        this.draw()
    }
}

function invaderShooting(shootingInvader) {
    if (!shootingInvader.positioningState && shootingInvader.invaderAbleToShoot) {
        // wohin wird geschossen (wo sich der Spieler relativ zum Gegner befindet)
        let angleInvaderPlayer = Math.atan2((player.position.y + (player.height / 2)) - (shootingInvader.position.y + (shootingInvader.height / 2)),
            (player.position.x + (player.width / 2)) - (shootingInvader.position.x + (shootingInvader.width / 2)))

        const position = {
            x: shootingInvader.position.x + (shootingInvader.width / 2),
            y: shootingInvader.position.y + (shootingInvader.height / 2)
        }
        const velocity = {
            x: Math.cos(angleInvaderPlayer) * data.ShootingInvader.bulletSpeed,
            y: Math.sin(angleInvaderPlayer) * data.ShootingInvader.bulletSpeed
        }

        projectile = new Projectile({
            position: position,
            velocity: velocity,
            imageSource: data.ShootingInvader.bulletImageSource
        })
        invaderProjectiles.push(projectile)

        shootingInvader.invaderAbleToShoot = false
        setTimeout(() => { shootingInvader.invaderAbleToShoot = true }, 1000)
    }
}

let setInvaderPosition = function (invaderWidth, invaderHeight) {
    let randomIndex = Math.random() < 0.5
    let randomIndex2 = Math.random() < 0.5
    let position = {
        x: 0,
        y: 0
    }

    if (randomIndex) {
        position.x = Math.floor(Math.random() * (canvas.width - invaderWidth)) + 1
        if (randomIndex2) {
            position.y = 0 - invaderHeight - 2
        }
        else {
            position.y = canvas.height
        }
    }
    else {
        position.y = Math.floor(Math.random() * (canvas.height - invaderHeight)) + 1
        if (randomIndex2) {
            position.x = 0 - invaderWidth - 2
        }
        else {
            position.x = canvas.width
        }
    }
    return position
}

function initShootingInvader() {
    shootingInvader = new ShootingInvader({ position: setInvaderPosition(data.ShootingInvader.width, data.ShootingInvader.height) })
    invaders.push(shootingInvader)
}


let chasingInvader

class ChasingInvader {
    constructor({ position }) {
        this.width = data.ChasingInvader.width
        this.height = data.ChasingInvader.height
        this.position = position
        this.velocity = {
            x: 0,
            y: 0
        }
        //this.speed = data.ChasingInvader.speed
        this.image = new Image()
        this.image.src = data.ChasingInvader.imageSource
    }

    draw() {
        if (this.image && this.image.complete) {
            c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height)
        }
    }

    update() {
        // Berechnung der Bewegungsrichtung
        let angleInvaderPlayer = Math.atan2((player.position.y + (player.height / 2)) - (this.position.y + (this.height / 2)),
            (player.position.x + (player.width / 2)) - (this.position.x + (this.width / 2)))

        this.velocity = {
            x: Math.cos(angleInvaderPlayer) * data.ChasingInvader.speed,
            y: Math.sin(angleInvaderPlayer) * data.ChasingInvader.speed
        }

        // Bewegung selbst
        this.position.x += this.velocity.x
        this.position.y += this.velocity.y
        this.draw()
    }
}

function initChasingInvader() {
    chasingInvader = new ChasingInvader({ position: setInvaderPosition(data.ChasingInvader.width, data.ChasingInvader.height) })
    invaders.push(chasingInvader)
}


let beerTimeout
let shieldTimeout
let potionTimeout
let lightningTimeout
let pentagramTimeout

let pointsAmount = 0
let playerLives = 3
let amountMinutes = 0
let amountSeconds = 0

const pointsLabel = document.getElementById("points")
const livesLabel = document.getElementById("lives")
const timeLabel = document.getElementById("time")

const footer = document.querySelector("footer");
const notificationDiv = document.getElementById("notification");
const scorePointsLabel = document.getElementById("score-points-label");
const scoreTimeLabel = document.getElementById("score-time-label");
const startButton = document.getElementById("button-label");

function animate() {
    if (!gameGoingOn) {
        canvas.classList.add("blur-effect")
        footer.style.display = "flex"
        notificationDiv.style.display = "flex"
        scorePointsLabel.style.display = "block"
        scoreTimeLabel.style.display = "block"
        scorePointsLabel.textContent = `Your points: ${pointsAmount}`
        scoreTimeLabel.textContent = `Your Time: ${(amountMinutes < 10) ? "0" + amountMinutes : amountMinutes}:${(amountSeconds < 10) ? "0" + amountSeconds : amountSeconds}`
        startButton.textContent = "Play Again!"
        clearTimeout(beerTimeout)
        beerTimeout = null
        powerupFlags.beerPowerdown = false
        clearTimeout(shieldTimeout)
        shieldTimeout = null
        powerupFlags.shieldPowerup = false
        clearTimeout(potionTimeout)
        potionTimeout = null
        powerupFlags.potionPowerdown = false
        clearTimeout(lightningTimeout)
        lightningTimeout = null
        powerupFlags.lightningPowerup = false
        clearTimeout(pentagramTimeout)
        pentagramTimeout = null
        powerupFlags.pentagramPowerup = false
        clearInterval(shootingInvaderInterval)
        clearInterval(chasingInvaderInterval)
        clearInterval(powerupInterval)
        clearInterval(timeplayerLivesInterval)
        return
    }

    c.clearRect(0, 0, canvas.width, canvas.height)

    player.update()
    playerShooting()

    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i]
        powerup.draw()
        if ((powerup.position.x + powerup.width) >= player.position.x && powerup.position.x <= (player.position.x + player.width) &&
            (powerup.position.y + powerup.height) >= player.position.y && powerup.position.y <= (player.position.y + player.height)) {
            switch (powerup.type) {
                case "beer":
                    powerupFlags.beerPowerdown = true
                    clearInterval(shootingInvaderInterval)
                    shootingInvaderInterval = setInterval(() => { initShootingInvader() }, 1500)
                    clearInterval(chasingInvaderInterval)
                    chasingInvaderInterval = setInterval(() => { initChasingInvader() }, 500)

                    if (beerTimeout) { clearTimeout(beerTimeout) }

                    beerTimeout = setTimeout(() => {
                        clearInterval(shootingInvaderInterval)
                        shootingInvaderInterval = setInterval(() => { initShootingInvader() }, 2500)
                        clearInterval(chasingInvaderInterval)
                        chasingInvaderInterval = setInterval(() => { initChasingInvader() }, 800)
                        powerupFlags.beerPowerdown = false
                        beerTimeout = null
                    }, 15000)
                    break
                case "shield":
                    powerupFlags.shieldPowerup = true
                    if (shieldTimeout) { clearTimeout(shieldTimeout) }
                    shieldTimeout = setTimeout(() => {
                        powerupFlags.shieldPowerup = false
                        shieldTimeout = null
                    }, 15000)
                    break
                case "potion":
                    powerupFlags.potionPowerdown = true
                    if (potionTimeout) { clearTimeout(potionTimeout) }
                    potionTimeout = setTimeout(() => {
                        powerupFlags.potionPowerdown = false
                        potionTimeout = null
                    }, 15000)
                    break
                case "lightning":
                    powerupFlags.lightningPowerup = true
                    if (lightningTimeout) { clearTimeout(lightningTimeout) }
                    lightningTimeout = setTimeout(() => { powerupFlags.lightningPowerup = false; lightningTimeout = null }, 15000)
                    break
                case "pentagram":
                    powerupFlags.pentagramPowerup = true
                    if (pentagramTimeout) { clearTimeout(pentagramTimeout) }
                    pentagramTimeout = setTimeout(() => {
                        powerupFlags.pentagramPowerup = false
                        pentagramTimeout = null
                    }, 15000)
                    break
                case "ice":
                    livesLabel.textContent = ++playerLives
                    break
            }
            powerups.splice(i, 1)
        }
    }
    if (powerups.length > 5) {
        setTimeout(() => { powerups.splice(0, 1) }, 0)
    }

    for (let i = invaders.length - 1; i >= 0; i--) {
        const invader = invaders[i]
        invader.update()
        if (invader instanceof ShootingInvader) {
            invaderShooting(invader)
        }
        else {
            if ((invader.position.x + invader.width) >= player.position.x && invader.position.x <= (player.position.x + player.width) &&
                (invader.position.y + invader.height) >= player.position.y && invader.position.y <= (player.position.y + player.height)) {
                setTimeout(() => { invaders.splice(i, 1) }, 0)

                playerLives -= (powerupFlags.shieldPowerup) ? 0.5 : 1
                livesLabel.textContent = (playerLives < 0) ? 0 : playerLives // DOM-Manipulation
            }
        }

        for (let j = playerProjectiles.length - 1; j >= 0; j--) {
            const playerProjectile = playerProjectiles[j]
            if (playerProjectile.position.x >= invader.position.x && playerProjectile.position.x <= (invader.position.x + invader.width) &&
                playerProjectile.position.y >= invader.position.y && playerProjectile.position.y <= (invader.position.y + invader.height)) {
                if (!powerupFlags.pentagramPowerup) { setTimeout(() => { playerProjectiles.splice(j, 1) }, 0) }
                setTimeout(() => { invaders.splice(i, 1) }, 0)

                pointsLabel.textContent = ++pointsAmount // DOM-Manipulation
            }
        }
    }

    // zusätzlich forEach für playerProjectile (wenn es keine Invaders gibt, garf es doch auch geschossen werden)
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        const playerProjectile = playerProjectiles[i]
        if (playerProjectile.position.x < 0 || playerProjectile.position.x > canvas.width ||
            playerProjectile.position.y < 0 || playerProjectile.position.y > canvas.height) {
            setTimeout(() => { playerProjectiles.splice(i, 1) }, 0)
        }
        else {
            playerProjectile.update()
        }
    }

    for (let i = invaderProjectiles.length - 1; i >= 0; i--) {
        const invaderProjectile = invaderProjectiles[i]
        if (invaderProjectile.position.x >= player.position.x && invaderProjectile.position.x <= (player.position.x + player.width) &&
            invaderProjectile.position.y >= player.position.y && invaderProjectile.position.y <= (player.position.y + player.height)) {
            setTimeout(() => { invaderProjectiles.splice(i, 1) }, 0)

            playerLives -= (powerupFlags.shieldPowerup) ? 0.25 : 0.5
            livesLabel.textContent = (playerLives < 0) ? 0 : playerLives // DOM-Manipulation
        }
        else if (invaderProjectile.position.x < 0 || invaderProjectile.position.x > canvas.width ||
            invaderProjectile.position.y < 0 || invaderProjectile.position.y > canvas.height) {
            setTimeout(() => { invaderProjectiles.splice(i, 1) }, 0)
        }
        else {
            invaderProjectile.update()
        }
    }

    if (playerLives <= 0) {
        gameGoingOn = false
    }

    requestAnimationFrame(animate)
}

function initPlayer() {
    player = new Player()
    animate()
}


startButton.addEventListener("click", () => { // Start Game
    footer.style.display = "none"
    notificationDiv.style.display = "none"
    canvas.classList.remove("blur-effect")
    gameGoingOn = true

    powerupInterval = setInterval(() => { initPowerup() }, 5000)
    shootingInvaderInterval = setInterval(() => { initShootingInvader() }, 2500)
    chasingInvaderInterval = setInterval(() => { initChasingInvader() }, 800)

    pointsAmount = 0
    playerLives = 3
    amountSeconds = 0
    amountMinutes = 0
    livesLabel.textContent = playerLives
    pointsLabel.textContent = pointsAmount
    timeLabel.textContent = "00:00"

    timeplayerLivesInterval = setInterval(() => {
        ++amountSeconds
        if (amountSeconds % 60 === 0) {
            ++amountMinutes
            amountSeconds = 0
        }
        timeLabel.textContent = `${(amountMinutes < 10) ? "0" + amountMinutes : amountMinutes}:${(amountSeconds < 10) ? "0" + amountSeconds : amountSeconds}`
    }, 1000)

    powerups.length = 0
    playerProjectiles.length = 0
    invaderProjectiles.length = 0
    invaders.length = 0

    if (!player) {
        initPlayer()
    }
    else {
        player.position.x = canvas.width / 2 - player.width / 2
        player.position.y = canvas.height - player.height
        animate()
    }
})


addEventListener("keydown", ({ key }) => {
    switch (key) {
        case "a":
            keyPressed.a = true
            break
        case "d":
            keyPressed.d = true
            break
        case "w":
            keyPressed.w = true
            break
        case "s":
            keyPressed.s = true
            break
        case " ":
            keyPressed.space = true
            break
    }
})

addEventListener("keyup", ({ key }) => {
    switch (key) {
        case "a":
            keyPressed.a = false
            break
        case "d":
            keyPressed.d = false
            break
        case "w":
            keyPressed.w = false
            break
        case "s":
            keyPressed.s = false
            break
        case " ":
            keyPressed.space = false
            break
    }
})

addEventListener("mousemove", (event) => {
    mousePosition.x = event.clientX
    mousePosition.y = event.clientY
})
