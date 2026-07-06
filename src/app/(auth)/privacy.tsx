import { LegalDoc } from '@/components/ui/legal-doc';

export default function Privacy() {
  return (
    <LegalDoc
      title="Privacy Policy"
      intro="This policy explains what personal data Hiramda collects and how it is used, in line with the Philippine Data Privacy Act."
      sections={[
        {
          heading: 'What we collect',
          body: 'Your name, email, mobile number, and address — used to manage your account, bookings, and pickup coordination.',
        },
        {
          heading: 'How we use it',
          body: 'To verify your identity by phone OTP, process reservations and payments, and send booking notifications.',
        },
        {
          heading: 'Your rights',
          body: 'You may access, correct, or delete your data at any time. Account deletion is available in the app before launch (Phase 9).',
        },
      ]}
    />
  );
}
