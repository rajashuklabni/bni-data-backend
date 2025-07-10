const crypto = require("crypto");

class PayoutWebhookEvent {
	constructor(type, rawBody, object) {
		this.type = type;
		this.raw = rawBody;
		this.object = object;
	}
}

class Cashfree {
	static XClientSecret;
	static XApiVersion = "2024-01-01";

	/**
	 * Use this API to verify your webhook signature once you receive from Cashfree's server.
	 * @summary Verify Webhook Signatures
	 * @param {string} signature that is present in the header of the webhook ("x-webhook-signature")
	 * @param {string} rawBody is the entire body sent to the server in string format
	 * @param {string} timestamp that is present in the header of the webhook ("x-webhook-timestamp")
	 * @throws {Error}
	 */
	static PGVerifyWebhookSignature(signature, rawBody, timestamp) {
		console.log('=== Signature Verification Debug ===');
		console.log('Received signature:', signature);
		console.log('Timestamp:', timestamp);
		console.log('Raw body length:', rawBody?.length || 0);
		console.log('Raw body preview:', rawBody?.substring(0, 200) + '...');
		console.log('Secret key length:', Cashfree.XClientSecret?.length || 0);
		console.log('Secret key preview:', Cashfree.XClientSecret?.substring(0, 10) + '...');

		// Validate inputs
		if (!signature || !rawBody || !timestamp) {
			console.error('Missing required parameters for signature verification');
			throw new Error('Missing required parameters for signature verification');
		}

		if (!Cashfree.XClientSecret) {
			console.error('Client secret not configured');
			throw new Error('Client secret not configured');
		}

		// Try different signature formats
		const signatureFormats = [
			// Format 1: timestamp + rawBody (original)
			{ body: timestamp + rawBody, description: 'timestamp + rawBody' },
			// Format 2: rawBody only
			{ body: rawBody, description: 'rawBody only' },
			// Format 3: timestamp + rawBody with different encoding
			{ body: timestamp + rawBody, description: 'timestamp + rawBody (hex)' },
			// Format 4: Just rawBody with hex encoding
			{ body: rawBody, description: 'rawBody only (hex)' }
		];

		const secretKey = Cashfree.XClientSecret;
		
		for (let i = 0; i < signatureFormats.length; i++) {
			const format = signatureFormats[i];
			let generatedSignature;
			
			if (i === 2 || i === 3) {
				// Try hex encoding for formats 3 and 4
				generatedSignature = crypto
					.createHmac("sha256", secretKey)
					.update(format.body)
					.digest("hex");
			} else {
				// Use base64 encoding for formats 1 and 2
				generatedSignature = crypto
					.createHmac("sha256", secretKey)
					.update(format.body)
					.digest("base64");
			}
			
			console.log(`Format ${i + 1} (${format.description}):`, generatedSignature);
			console.log(`Format ${i + 1} matches:`, generatedSignature === signature);
			
			if (generatedSignature === signature) {
				console.log(`✅ Signature verified using format ${i + 1}`);
				try {
					let jsonObject = JSON.parse(rawBody);
					return new PayoutWebhookEvent(jsonObject.type, rawBody, jsonObject);
				} catch (parseError) {
					console.error('Error parsing webhook body:', parseError);
					throw new Error('Invalid JSON in webhook body');
				}
			}
		}
		
		console.log('❌ All signature formats failed to match');
		console.log('=== End Debug ===');
		
		throw new Error(
			"Generated signature and received signature did not match for any format."
		);
	}
}

module.exports = { Cashfree, PayoutWebhookEvent };