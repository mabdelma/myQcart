import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useI18n } from '../../contexts/I18nContext';
import { paymentApi } from '../../lib/api';

interface StripePaymentFormProps {
  slug: string;
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StripePaymentForm({ slug, orderId, amount, onSuccess, onCancel }: StripePaymentFormProps) {
  const { t } = useI18n();
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    try {
      const { clientSecret } = await paymentApi.createIntent(slug, { orderId });
      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement)! },
      });

      if (stripeError) {
        setError(stripeError.message || t('error.generic'));
      } else {
        onSuccess();
      }
    } catch {
      setError(t('error.generic'));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-4 border">
        <h4 className="font-medium mb-2">{t('payment.card')}</h4>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': { color: '#aab7c4' },
              },
              invalid: { color: '#9e2146' },
            },
          }}
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
        <button type="submit" disabled={!stripe || processing}
          className="flex-1 py-2 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033] disabled:opacity-50">
          {processing ? `${t('common.loading')}...` : `${t('payment.pay')} $${amount.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}
