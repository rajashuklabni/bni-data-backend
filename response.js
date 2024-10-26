[
    {
      "cf_payment_id": "12376123",
      "order_id": "order_8123",
      "entity": "payment",
      "payment_currency": "INR",
      "error_details": null,
      "order_amount": 10.01,
      "is_captured": true,
      "payment_group": "upi",
      "authorization": {
        "action": "CAPTURE",
        "status": "PENDING",
        "captured_amount": 100,
        "start_time": "2022-02-09T18:04:34+05:30",
        "end_time": "2022-02-19T18:04:34+05:30",
        "approve_by": "2022-02-09T18:04:34+05:30",
        "action_reference": "6595231908096894505959",
        "action_time": "2022-08-03T16:09:51"
      },
      "payment_method": {
        "upi": {
          "channel": "collect",
          "upi_id": "rohit@xcxcx"
        }
      },
      "payment_amount": 10.01,
      "payment_time": "2021-07-23T12:15:06+05:30",
      "payment_completion_time": "2021-07-23T12:18:59+05:30",
      "payment_status": "SUCCESS",
      "payment_message": "Transaction successful",
      "bank_reference": "P78112898712",
      "auth_id": "A898101"
    },
    {
      "cf_payment_id": "12376124",
      "order_id": "order_8123",
      "entity": "payment",
      "payment_currency": "INR",
      "error_details": {
        "error_code": "TRANSACTION_DECLINED",
        "error_description": "issuer bank or payment service provider declined the transaction",
        "error_reason": "auth_declined",
        "error_source": "customer"
      },
      "order_amount": 10.01,
      "is_captured": true,
      "payment_group": "credit_card",
      "authorization": null,
      "payment_method": {
        "card": {
          "channel": "link",
          "card_number": "xxxxxx1111"
        }
      },
      "payment_amount": 10.01,
      "payment_time": "2021-07-23T12:15:06+05:30",
      "payment_completion_time": "2021-07-23T12:18:59+05:30",
      "payment_status": "FAILED",
      "payment_message": "Transaction failed",
      "bank_reference": "P78112898712",
      "auth_id": "A898101"
    }
  ]