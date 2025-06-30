// Utility: Calculate member's pending and advance amounts (backend version)
async function calculateMemberPendingAmountBackend(member, kittyBills, allOrders, allTransactions, allCredits) {
    try {
        const memberId = member.member_id;
        const chapterId = member.chapter_id;
        let openingBalance = member.meeting_opening_balance || 0;
        if (openingBalance > 0) openingBalance = -Math.abs(openingBalance);

        let runningBalance = openingBalance;
        const allTransactionItems = [];

        // Opening balance
        allTransactionItems.push({
            date: new Date(member.date_of_publishing),
            type: 'opening',
            debit: 0,
            credit: 0,
            gst: 0,
            totalAmount: 0,
            runningBalance: openingBalance
        });

        // Credits
        const memberCredits = allCredits.filter(c =>
            c.member_id == memberId &&
            c.chapter_id == chapterId
        );
        memberCredits.forEach(credit => {
            allTransactionItems.push({
                date: new Date(credit.credit_date),
                type: 'credit',
                debit: 0,
                credit: parseFloat(credit.credit_amount),
                gst: 0,
                totalAmount: parseFloat(credit.credit_amount)
            });
        });

        // Kitty bills
        const chapterKittyBills = kittyBills.filter(bill =>
            bill.chapter_id === chapterId
        ).sort((a, b) => new Date(a.raised_on) - new Date(b.raised_on));

        chapterKittyBills.forEach(bill => {
            const billDate = new Date(bill.raised_on);
            const baseAmount = parseFloat(bill.total_bill_amount);
            const gstAmount = Math.round(baseAmount * 0.18);
            const totalAmount = baseAmount + gstAmount;
            const memberJoin = new Date(member.date_of_publishing);

            // Only add bill if member joined before or on bill start
            if (memberJoin <= billDate) {
                allTransactionItems.push({
                    date: billDate,
                    type: 'kitty_bill',
                    debit: baseAmount,
                    credit: 0,
                    gst: gstAmount,
                    totalAmount: totalAmount
                });
            }

            // Payments for this bill
            const billOrders = allOrders.filter(order =>
                order.universal_link_id === 4 &&
                order.kitty_bill_id === bill.kitty_bill_id &&
                order.customer_id === memberId &&
                order.chapter_id === chapterId &&
                order.payment_note === 'meeting-payments'
            );

            const billTransactions = billOrders
                .map(order => allTransactions.find(t => t.order_id === order.order_id && t.payment_status === 'SUCCESS'))
                .filter(Boolean)
                .sort((a, b) => new Date(a.payment_completion_time) - new Date(b.payment_completion_time));

            billTransactions.forEach((payment) => {
                const paymentDate = new Date(payment.payment_completion_time);
                const paymentOrder = billOrders.find(order => order.order_id === payment.order_id);
                const paymentBaseAmount = parseFloat(paymentOrder.order_amount) - parseFloat(paymentOrder.tax);

                allTransactionItems.push({
                    date: paymentDate,
                    type: 'payment',
                    debit: 0,
                    credit: paymentBaseAmount,
                    gst: parseFloat(paymentOrder.tax),
                    totalAmount: parseFloat(paymentOrder.order_amount)
                });
            });

            // Penalty if applicable
            const penaltyAmount = bill.penalty_fee || 0;
            const dueDate = bill.kitty_due_date ? new Date(bill.kitty_due_date) : new Date(bill.raised_on);
            const now = new Date();

            if (penaltyAmount > 0 && dueDate.getTime() >= memberJoin.getTime() && now.getTime() > dueDate.getTime()) {
                allTransactionItems.push({
                    date: dueDate,
                    type: 'penalty',
                    debit: penaltyAmount,
                    credit: 0,
                    gst: 0,
                    totalAmount: penaltyAmount
                });
            }
        });

        // Sort and calculate running balance
        allTransactionItems.sort((a, b) => new Date(a.date) - new Date(b.date));
        let currentBalance = openingBalance;
        allTransactionItems.forEach(item => {
            if (item.type === 'opening') {
                item.runningBalance = openingBalance;
            } else {
                currentBalance = currentBalance - (item.debit || 0) + (item.credit || 0);
                item.runningBalance = currentBalance;
            }
        });

        // Calculate pending amount based on final running balance (matching frontend logic)
        // If running balance is negative, that's the pending amount (positive value)
        // If running balance is positive, that's advance payment, pending is 0
        const pendingAmount = currentBalance < 0 ? Math.abs(currentBalance) : 0;

        return {
            pendingAmount: pendingAmount,
            runningBalance: currentBalance
        };
    } catch (error) {
        console.error(`Error calculating pending amount for member ${member.member_id}:`, error);
        return { pendingAmount: 0, runningBalance: 0 };
    }
}

module.exports = {
    calculateMemberPendingAmountBackend
};
