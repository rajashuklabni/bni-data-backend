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

		const body = timestamp + rawBody;
		console.log('Combined string length:', body.length);
		console.log('Combined string preview:', body.substring(0, 200) + '...');

		const secretKey = Cashfree.XClientSecret;
		let generatedSignature = crypto
			.createHmac("sha256", secretKey)
			.update(body)
			.digest("base64");
		
		console.log('Generated signature:', generatedSignature);
		console.log('Signatures match:', generatedSignature === signature);
		console.log('=== End Debug ===');

		if (generatedSignature === signature) {
			try {
				let jsonObject = JSON.parse(rawBody);
				return new PayoutWebhookEvent(jsonObject.type, rawBody, jsonObject);
			} catch (parseError) {
				console.error('Error parsing webhook body:', parseError);
				throw new Error('Invalid JSON in webhook body');
			}
		}
		throw new Error(
			"Generated signature and received signature did not match."
		);
	}
}

module.exports = { Cashfree, PayoutWebhookEvent };