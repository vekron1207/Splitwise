package com.splitwise.service;

import com.splitwise.dto.response.SimplifiedDebtResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

@Service
public class DebtSimplificationService {

    /**
     * Greedy algorithm to minimize the number of transactions.
     *
     * @param netBalances map of userId → net balance (positive = creditor, negative = debtor)
     * @param userNames   map of userId → display name for enriching responses
     * @return minimum list of SimplifiedDebtResponse to settle all debts
     */
    public List<SimplifiedDebtResponse> simplify(Map<Long, BigDecimal> netBalances,
                                                  Map<Long, String> userNames) {
        // Work in cents (long) for fast, exact integer arithmetic
        // Max-heap: largest creditor first
        PriorityQueue<long[]> creditors = new PriorityQueue<>((a, b) -> Long.compare(b[1], a[1]));
        // Min-heap: most indebted debtor first (most negative value)
        PriorityQueue<long[]> debtors = new PriorityQueue<>((a, b) -> Long.compare(a[1], b[1]));

        for (Map.Entry<Long, BigDecimal> entry : netBalances.entrySet()) {
            long cents = entry.getValue()
                    .multiply(BigDecimal.valueOf(100))
                    .longValue();
            if (cents > 0) creditors.offer(new long[]{entry.getKey(), cents});
            else if (cents < 0) debtors.offer(new long[]{entry.getKey(), cents});
        }

        List<SimplifiedDebtResponse> result = new ArrayList<>();

        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            long[] creditor = creditors.poll();
            long[] debtor = debtors.poll();

            long settled = Math.min(creditor[1], -debtor[1]);

            result.add(SimplifiedDebtResponse.builder()
                    .fromUserId(debtor[0])
                    .fromUserName(userNames.getOrDefault(debtor[0], "Unknown"))
                    .toUserId(creditor[0])
                    .toUserName(userNames.getOrDefault(creditor[0], "Unknown"))
                    .amount(BigDecimal.valueOf(settled).divide(BigDecimal.valueOf(100)))
                    .build());

            creditor[1] -= settled;
            debtor[1] += settled;

            if (creditor[1] > 0) creditors.offer(creditor);
            if (debtor[1] < 0) debtors.offer(debtor);
        }

        return result;
    }
}
