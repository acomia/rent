import { LegalDoc } from '@/components/ui/legal-doc';

export default function Terms() {
  return (
    <LegalDoc
      title="Terms & Conditions"
      intro="These terms govern your use of Renta to reserve gowns and costumes. By creating an account you agree to them."
      sections={[
        {
          heading: 'Reservations & deposits',
          body: 'A booking is confirmed only once the online deposit is paid. The balance is settled in shop on pickup.',
        },
        {
          heading: 'Returns & late fees',
          body: 'Items are due on the agreed return date. Late returns and damage may incur fees recorded by the shop.',
        },
        {
          heading: 'Your responsibilities',
          body: 'You agree to provide accurate details, verify your phone number, and care for rented items during the rental period.',
        },
      ]}
    />
  );
}
