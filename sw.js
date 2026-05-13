/* =========================================================
   School Staff SACCO Union PWA Service Worker
   File: sw.js
   Editable Progressive Web App Service Worker
   ========================================================= */

/* =========================
   CACHE SETTINGS
========================= */
const CACHE_NAME = "school-sacco-pwa-v1.0.0";
const DYNAMIC_CACHE = "school-sacco-dynamic-v1";

const STATIC_ASSETS = [
    "./",
    "./index.html",
    "./login.html",
    "./register.html",
    "./admin.html",
    "./treasurer.html",
    "./member.html",

    "./css/style.css",

    "./js/app.js",
    "./js/auth.js",
    "./js/dashboard.js",
    "./js/storage.js",
    "./js/loans.js",
    "./js/savings.js",
    "./js/shares.js",

    "./manifest.json",

    "./icons/icon-72x72.png",
    "./icons/icon-96x96.png",
    "./icons/icon-128x128.png",
    "./icons/icon-144x144.png",
    "./icons/icon-152x152.png",
    "./icons/icon-192x192.png",
    "./icons/icon-384x384.png",
    "./icons/icon-512x512.png"
];

/* =========================
   INSTALL EVENT
========================= */
self.addEventListener("install", event => {

    console.log("✅ Service Worker Installing...");

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log("✅ Caching App Shell...");
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

/* =========================
   ACTIVATE EVENT
========================= */
self.addEventListener("activate", event => {

    console.log("✅ Service Worker Activated");

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {

                    if (
                        cache !== CACHE_NAME &&
                        cache !== DYNAMIC_CACHE
                    ) {
                        console.log("🗑 Removing Old Cache:", cache);
                        return caches.delete(cache);
                    }

                })
            );
        })
    );

    self.clients.claim();
});

/* =========================
   FETCH EVENT
========================= */
self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") return;

    event.respondWith(

        caches.match(event.request)
            .then(cacheResponse => {

                // Return cached version first
                if (cacheResponse) {
                    return cacheResponse;
                }

                // Otherwise fetch from network
                return fetch(event.request)
                    .then(networkResponse => {

                        return caches.open(DYNAMIC_CACHE)
                            .then(cache => {

                                cache.put(
                                    event.request,
                                    networkResponse.clone()
                                );

                                return networkResponse;

                            });

                    })
                    .catch(() => {

                        // Offline fallback
                        if (
                            event.request.headers.get("accept")
                            .includes("text/html")
                        ) {
                            return caches.match("./index.html");
                        }

                    });

            })

    );

});

/* =========================
   PUSH NOTIFICATIONS
========================= */
self.addEventListener("push", event => {

    let data = {
        title: "School SACCO Notification",
        body: "You have a new update.",
        icon: "./icons/icon-192x192.png",
        badge: "./icons/icon-96x96.png"
    };

    if (event.data) {
        data = event.data.json();
    }

    event.waitUntil(

        self.registration.showNotification(
            data.title,
            {
                body: data.body,
                icon: data.icon,
                badge: data.badge,
                vibrate: [100, 50, 100],
                data: {
                    dateOfArrival: Date.now()
                }
            }
        )

    );

});

/* =========================
   NOTIFICATION CLICK
========================= */
self.addEventListener("notificationclick", event => {

    event.notification.close();

    event.waitUntil(

        clients.openWindow("./index.html")

    );

});

/* =========================
   BACKGROUND SYNC
========================= */
self.addEventListener("sync", event => {

    console.log("🔄 Background Sync Triggered");

    if (event.tag === "sync-transactions") {

        event.waitUntil(syncPendingTransactions());

    }

});

/* =========================
   TEMPORARY DATABASE
   (GitHub Pages Demo Storage)
========================= */

const SACCO_DB = {
    users: [],
    savings: [],
    loans: [],
    deposits: [],
    shares: [],
    settings: []
};

/* =========================
   DEFAULT SETTINGS
========================= */

const DEFAULT_SETTINGS = {

    currency: "UGX",

    minimumDeposit: 10000,

    loanInterestRate: 10,

    maximumLoanMultiplier: 3,

    sharePercentage: 5,

    latePaymentPenalty: 2,

    editable: true

};

/* =========================
   DEMO USERS
========================= */

const DEMO_USERS = [

    {
        school: "School",
        schoolId: "School",
        name: "System Admin",
        username: "Admin123",
        email: "admin@school.com",
        password: "123",
        role: "Admin",
        savingsBalance: 0,
        shares: 0
    },

    {
        school: "School",
        schoolId: "School",
        name: "System Treasurer",
        username: "Treasurer123",
        email: "treasurer@school.com",
        password: "123",
        role: "Treasurer",
        savingsBalance: 0,
        shares: 0
    },

    {
        school: "School",
        schoolId: "School",
        name: "System Member",
        username: "Member123",
        email: "member@school.com",
        password: "123",
        role: "Member",
        savingsBalance: 0,
        shares: 0
    }

];

/* =========================
   INITIALIZE DATABASE
========================= */

async function initializeDatabase() {

    const cache = await caches.open("school-sacco-db");

    const users = await cache.match("users");
    const settings = await cache.match("settings");

    if (!users) {

        await cache.put(
            "users",
            new Response(
                JSON.stringify(DEMO_USERS)
            )
        );

    }

    if (!settings) {

        await cache.put(
            "settings",
            new Response(
                JSON.stringify(DEFAULT_SETTINGS)
            )
        );

    }

}

initializeDatabase();

/* =========================
   USER REGISTRATION
========================= */

async function registerUser(userData) {

    const cache = await caches.open("school-sacco-db");

    const usersResponse = await cache.match("users");

    let users = [];

    if (usersResponse) {
        users = await usersResponse.json();
    }

    const existingUser = users.find(user =>

        user.username === userData.username ||
        user.email === userData.email

    );

    if (existingUser) {

        return {
            success: false,
            message: "Username or Email already exists."
        };

    }

    const newUser = {

        id: Date.now(),

        school: userData.school,

        schoolId: userData.schoolId,

        name: userData.name,

        username: userData.username,

        email: userData.email,

        password: userData.password,

        role: userData.role || "Member",

        savingsBalance: 0,

        shares: 0,

        loans: [],

        deposits: [],

        registeredAt: new Date().toISOString()

    };

    users.push(newUser);

    await cache.put(
        "users",
        new Response(JSON.stringify(users))
    );

    return {
        success: true,
        message: "Registration Successful",
        user: newUser
    };

}

/* =========================
   USER LOGIN
========================= */

async function loginUser(credentials) {

    const cache = await caches.open("school-sacco-db");

    const usersResponse = await cache.match("users");

    let users = [];

    if (usersResponse) {
        users = await usersResponse.json();
    }

    const user = users.find(u =>

        u.schoolId === credentials.schoolId &&
        u.username === credentials.username &&
        u.password === credentials.password

    );

    if (!user) {

        return {
            success: false,
            message: "Invalid Login Credentials"
        };

    }

    return {
        success: true,
        message: "Login Successful",
        user
    };

}

/* =========================
   LOAN REQUEST
========================= */

async function requestLoan(loanData) {

    const cache = await caches.open("school-sacco-db");

    const loansResponse = await cache.match("loans");

    let loans = [];

    if (loansResponse) {
        loans = await loansResponse.json();
    }

    const loan = {

        id: Date.now(),

        memberId: loanData.memberId,

        memberName: loanData.memberName,

        amount: loanData.amount,

        interestRate: loanData.interestRate,

        repaymentMonths: loanData.repaymentMonths,

        status: "Pending",

        approvedBy: null,

        disbursedBy: null,

        createdAt: new Date().toISOString()

    };

    loans.push(loan);

    await cache.put(
        "loans",
        new Response(JSON.stringify(loans))
    );

    return {
        success: true,
        message: "Loan Request Submitted",
        loan
    };

}

/* =========================
   APPROVE LOAN
========================= */

async function approveLoan(loanId, adminName) {

    const cache = await caches.open("school-sacco-db");

    const loansResponse = await cache.match("loans");

    let loans = [];

    if (loansResponse) {
        loans = await loansResponse.json();
    }

    loans = loans.map(loan => {

        if (loan.id === loanId) {

            loan.status = "Approved";

            loan.approvedBy = adminName;

            loan.approvedAt = new Date().toISOString();

        }

        return loan;

    });

    await cache.put(
        "loans",
        new Response(JSON.stringify(loans))
    );

    return {
        success: true,
        message: "Loan Approved"
    };

}

/* =========================
   DISBURSE LOAN
========================= */

async function disburseLoan(loanId, treasurerName) {

    const cache = await caches.open("school-sacco-db");

    const loansResponse = await cache.match("loans");

    let loans = [];

    if (loansResponse) {
        loans = await loansResponse.json();
    }

    loans = loans.map(loan => {

        if (loan.id === loanId) {

            loan.status = "Disbursed";

            loan.disbursedBy = treasurerName;

            loan.disbursedAt = new Date().toISOString();

        }

        return loan;

    });

    await cache.put(
        "loans",
        new Response(JSON.stringify(loans))
    );

    return {
        success: true,
        message: "Loan Disbursed"
    };

}

/* =========================
   RECORD DEPOSIT
========================= */

async function recordDeposit(depositData) {

    const cache = await caches.open("school-sacco-db");

    const depositsResponse = await cache.match("deposits");

    let deposits = [];

    if (depositsResponse) {
        deposits = await depositsResponse.json();
    }

    const deposit = {

        id: Date.now(),

        memberId: depositData.memberId,

        memberName: depositData.memberName,

        amount: depositData.amount,

        currency: "UGX",

        recordedBy: depositData.recordedBy,

        createdAt: new Date().toISOString()

    };

    deposits.push(deposit);

    await cache.put(
        "deposits",
        new Response(JSON.stringify(deposits))
    );

    return {
        success: true,
        message: "Deposit Recorded",
        deposit
    };

}

/* =========================
   SHARE INDEX CALCULATOR
========================= */

function calculateShareIndex(totalSavings, sharePercentage) {

    return (totalSavings * sharePercentage) / 100;

}

/* =========================
   SYNC PENDING TRANSACTIONS
========================= */

async function syncPendingTransactions() {

    console.log("📡 Syncing Pending Transactions...");

    return Promise.resolve(true);

}

/* =========================
   MESSAGE EVENT
========================= */

self.addEventListener("message", event => {

    if (!event.data) return;

    console.log("📩 Message Received:", event.data);

    if (event.data.action === "SKIP_WAITING") {

        self.skipWaiting();

    }

});

/* =========================================================
   END OF SERVICE WORKER FILE
========================================================= */