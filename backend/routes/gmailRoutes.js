const express = require("express");
const passport = require("passport"); // handlesuser authentication (google login)
const GoogleStrategy = require("passport-google-oauth20").Strategy; // login method
const session = require("express-session"); // sessions remember the logged-in user 
const { google } = require("googleapis"); // import gogole gmail api library

const router = express.Router();

// configuration 
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = "http://localhost:5001/api/gmail/auth/google/callback";

// session 

router.use(
    session({
        secret: "gmail-secret",
        resave: false,
        saveUninitialized: false
    }) 
); // session stores user, access token, refresh token 

router.use(passport.initialize()); // turn passport on 
router.use(passport.session()); // allow passport to use express session 

passport.serializeUser((user, done) => done(null, user)); // when login succeeds, passport saves the user
passport.deserializeUser((obj, done) => done(null, obj)); // passport loads the user again 

// google strategy 
passport.use( // use google as the login provider 
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID || CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || CLIENT_SECRET,
            callbackURL: CALLBACK_URL
        },
        async (accessToken, refreshToken, profile, done) => {
            const user = {
                profile, 
                accessToken,
                refreshToken
            };
            return done(null, user);
        }
    )
);

// login 
router.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: [
            "profile",
            "email",
            "https://www.googleapis.com/auth/gmail.readonly"
        ],
        accessType: "offline",
        prompt: "consent"
    })
);

// callback 

router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/"
    }),
    async (req, res) => {
        const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);

        auth.setCredentials({
            access_token: req.user.accessToken,
            refresh_token: req.user.refreshToken
        });

        const gmail = google.gmail({
            version: "v1",
            auth
        });

        try {
            // 1. Target transactional keywords across your last 30 days
            const response = await gmail.users.messages.list({
                userId: "me",
                q: "subject:newer_than:30d"
            });

            const messages = response.data.messages || [];
            const purchases = [];

            for (const message of messages) {
                const mail = await gmail.users.messages.get({
                    userId: "me",
                    id: message.id,
                    format: "full"
                });

                const payload = mail.data.payload;
                const headers = payload.headers;

                const subject = headers.find(h => h.name.toLowerCase() === "subject")?.value || "";
                const date = headers.find(h => h.name.toLowerCase() === "date")?.value || "";
                const fromHeader = headers.find(h => h.name.toLowerCase() === "from")?.value || "";

                // 2. Extract Body (Recursively handle plain text and HTML components)
                let body = "";
                
                const extractBodyText = (part) => {
                    if (part.body && part.body.data) {
                        return Buffer.from(part.body.data, "base64").toString();
                    }
                    if (part.parts) {
                        for (const subPart of part.parts) {
                            const result = extractBodyText(subPart);
                            if (result) return result; 
                        }
                    }
                    return "";
                };

                if (payload.parts) {
                    // Prioritize clear plain text summaries, fallback to deep HTML layer reading
                    const textPart = payload.parts.find(p => p.mimeType === "text/plain");
                    const htmlPart = payload.parts.find(p => p.mimeType === "text/html");
                    
                    if (textPart) body = extractBodyText(textPart);
                    else if (htmlPart) body = extractBodyText(htmlPart);
                } else {
                    body = extractBodyText(payload);
                }

                // 3. Robust Regex pattern matching for Currency values and standard Symbols
                let amount = null;
                const priceRegex = /(SGD|USD|MYR|EUR|GBP|gBp|\$|£|€)\s?([\d,]+\.\d{2}|[\d,]+)/i;
                const amountMatch = body.match(priceRegex);

                if (amountMatch) {
                    let currency = amountMatch[1].toUpperCase();
                    // Map common shorthand currency symbols safely back to tracking schemas
                    if (currency === "$") currency = "SGD";
                    if (currency === "£") currency = "GBP";
                    if (currency === "€") currency = "EUR";

                    const rawValue = amountMatch[2].replace(/,/g, ""); // Remove formatting commas
                    amount = {
                        currency,
                        value: parseFloat(rawValue)
                    };
                }

                // 4. Smart Merchant Deduction Mapping
                let merchant = "Unknown Merchant";
                
                if (fromHeader) {
                    // Cleans up headers like "Sukiya <no-reply@sukiya.sg>" into "Sukiya"
                    const fallbackName = fromHeader.replace(/<.*>/, "").replace(/"/g, "").trim();
                    if (fallbackName) merchant = fallbackName;
                }

                // Hard keyword overrides matching your transactional screen hits
                const lowerSubject = subject.toLowerCase();
                const lowerFrom = fromHeader.toLowerCase();

                if (lowerSubject.includes("pepper lunch") || lowerFrom.includes("pepper lunch")) merchant = "Pepper Lunch";
                if (lowerSubject.includes("sukiya") || lowerFrom.includes("sukiya")) merchant = "Sukiya";
                if (lowerSubject.includes("coursera") || lowerFrom.includes("coursera")) merchant = "Coursera";
                if (lowerSubject.includes("singlife") || lowerFrom.includes("singlife")) merchant = "Singlife";
                if (lowerSubject.includes("dbs") || lowerFrom.includes("dbs") || lowerFrom.includes("ibanking")) merchant = "DBS Bank";

                purchases.push({
                    gmailId: message.id,
                    subject,
                    merchant,
                    amount,
                    date
                });
            }

            res.json({
                success: true,
                email: req.user.profile.emails[0].value,
                purchases
            });

        } catch (err) {
            console.error("DETAILED GMAIL API ERROR:", err);
            res.status(500).json({
                error: "Unable to read Gmail details cleanly."
            });
        }
    }
);

module.exports = router;

// http://localhost:5001/api/gmail/auth/google