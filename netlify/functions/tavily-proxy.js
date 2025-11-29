// netlify/functions/tavily-proxy.js

exports.handler = async function (event, context) {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { query } = JSON.parse(event.body);

        if (!query) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing query" }) };
        }

        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" }) };
        }

        // Call Tavily API directly
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: "basic",
                include_answer: true, // Restore AI answer functionality
                include_images: false,
                include_raw_content: false,
                max_results: 5
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { statusCode: response.status, body: errorText };
        }

        const data = await response.json();

        // Return the exact Tavily response structure
        // TODO: Add rate limiting to prevent abuse
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Proxy error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};