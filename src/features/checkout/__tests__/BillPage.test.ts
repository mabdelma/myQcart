import { describe, it, expect } from 'vitest';

interface OrderSummary {
  subtotal: number;
  tax: number;
  serviceCharge: number;
  itemCount: number;
}

function calcSubtotal(orders: OrderSummary[]): number {
  return orders.reduce((s, o) => s + o.subtotal, 0);
}

function calcTax(orders: OrderSummary[]): number {
  return orders.reduce((s, o) => s + o.tax, 0);
}

function calcServiceCharge(orders: OrderSummary[]): number {
  return orders.reduce((s, o) => s + o.serviceCharge, 0);
}

function calcTotalBeforeTip(subtotal: number, tax: number, serviceCharge: number): number {
  return subtotal + tax + serviceCharge;
}

function calcTipAmount(totalBeforeTip: number, tipPercent: number): number {
  return totalBeforeTip * (tipPercent / 100);
}

function calcPerPerson(grandTotal: number, splitCount: number): number {
  if (splitCount <= 0) return grandTotal;
  return grandTotal / splitCount;
}

function calcGrandTotal(totalBeforeTip: number, tipAmount: number): number {
  return totalBeforeTip + tipAmount;
}

describe('BillPage calculations', () => {
  it('sums subtotal across unpaid orders', () => {
    const orders: OrderSummary[] = [
      { subtotal: 20, tax: 2, serviceCharge: 0, itemCount: 2 },
      { subtotal: 15, tax: 1.5, serviceCharge: 0, itemCount: 1 },
    ];
    expect(calcSubtotal(orders)).toBe(35);
  });

  it('sums tax across orders', () => {
    const orders: OrderSummary[] = [
      { subtotal: 20, tax: 2, serviceCharge: 0, itemCount: 2 },
      { subtotal: 15, tax: 1.5, serviceCharge: 0, itemCount: 1 },
    ];
    expect(calcTax(orders)).toBe(3.5);
  });

  it('sums service charge across orders', () => {
    const orders: OrderSummary[] = [
      { subtotal: 20, tax: 2, serviceCharge: 1, itemCount: 2 },
      { subtotal: 15, tax: 1.5, serviceCharge: 0.75, itemCount: 1 },
    ];
    expect(calcServiceCharge(orders)).toBe(1.75);
  });

  it('calculates total before tip', () => {
    const total = calcTotalBeforeTip(35, 3.5, 1.75);
    expect(total).toBe(40.25);
  });

  it('calculates tip amount from percentage', () => {
    expect(calcTipAmount(100, 10)).toBe(10);
    expect(calcTipAmount(100, 15)).toBe(15);
    expect(calcTipAmount(100, 20)).toBe(20);
    expect(calcTipAmount(50, 15)).toBe(7.5);
    expect(calcTipAmount(100, 0)).toBe(0);
  });

  it('calculates grand total with tip', () => {
    const beforeTip = calcTotalBeforeTip(35, 3.5, 1.75);
    const tip = calcTipAmount(beforeTip, 15);
    const grand = calcGrandTotal(beforeTip, tip);
    expect(grand).toBeCloseTo(46.2875, 4);
  });

  it('splits total evenly among people', () => {
    const grand = 100;
    expect(calcPerPerson(grand, 1)).toBe(100);
    expect(calcPerPerson(grand, 2)).toBe(50);
    expect(calcPerPerson(grand, 4)).toBe(25);
  });

  it('handles zero split count gracefully', () => {
    expect(calcPerPerson(100, 0)).toBe(100);
  });

  it('handles zero orders', () => {
    expect(calcSubtotal([])).toBe(0);
    expect(calcTax([])).toBe(0);
    expect(calcServiceCharge([])).toBe(0);
  });

  it('end-to-end: 15% tip, split 3 ways', () => {
    const orders: OrderSummary[] = [
      { subtotal: 42, tax: 4.2, serviceCharge: 2.1, itemCount: 3 },
    ];
    const subtotal = calcSubtotal(orders);
    const tax = calcTax(orders);
    const sc = calcServiceCharge(orders);
    const beforeTip = calcTotalBeforeTip(subtotal, tax, sc);
    const tip = calcTipAmount(beforeTip, 15);
    const grand = calcGrandTotal(beforeTip, tip);
    const perPerson = calcPerPerson(grand, 3);

    expect(beforeTip).toBeCloseTo(48.3, 2);
    expect(tip).toBeCloseTo(7.245, 3);
    expect(grand).toBeCloseTo(55.545, 3);
    expect(perPerson).toBeCloseTo(18.515, 3);
  });
});
