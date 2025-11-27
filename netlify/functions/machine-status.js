exports.handler = async function (event, context) {
    try {
        // Fly.io API configuration
        const FLY_API_TOKEN = process.env.FLY_API_TOKEN;
        const APP_NAME = 'chatbot-backend-wandering-shadow-534';
        const MACHINE_ID = '286507df67e118';
        const FLY_API_URL = `https://api.machines.dev/v1/apps/${APP_NAME}/machines/${MACHINE_ID}`;

        if (!FLY_API_TOKEN) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'FLY_API_TOKEN not configured',
                    needsBoot: false
                })
            };
        }

        // Call Fly.io API to get machine state
        const response = await fetch(FLY_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${FLY_API_TOKEN}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Fly.io API returned ${response.status}`);
        }

        const data = await response.json();
        const state = data.state || 'unknown';

        // Check if machine needs to boot
        const needsBoot = state === 'suspended' || state === 'stopped';

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
            body: JSON.stringify({
                needsBoot,
                state
            })
        };

    } catch (error) {
        console.error('Error checking machine state:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: error.message,
                needsBoot: false // Fail gracefully, don't block the app
            })
        };
    }
};
