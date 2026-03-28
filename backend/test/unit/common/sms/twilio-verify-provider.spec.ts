import { TwilioVerifyProvider } from '../../../../src/common/sms/twilio-verify-provider';
import { InvalidPhoneNumberException } from '../../../../src/common/exceptions/invalid-phone-number.exception';

const MOCK_CTX = { requestId: 'test', userId: undefined } as any;

function makeProvider(verifyCreate: jest.Mock, checksCreate?: jest.Mock) {
  const provider = new TwilioVerifyProvider(
    { accountSid: 'AC_test', authToken: 'token', verifyServiceSid: 'VS_test' },
  );
  // Inject mock Twilio client
  (provider as any).client = {
    verify: {
      v2: {
        services: () => ({
          verifications: { create: verifyCreate },
          verificationChecks: { create: checksCreate ?? jest.fn() },
        }),
      },
    },
  };
  return provider;
}

describe('TwilioVerifyProvider', () => {
  describe('startVerification', () => {
    it('resolves without error for a valid number', async () => {
      const create = jest.fn().mockResolvedValue({});
      const provider = makeProvider(create);
      await expect(provider.startVerification(MOCK_CTX, '+5491112345678')).resolves.toBeUndefined();
    });

    it('throws InvalidPhoneNumberException when Twilio reports a non-mobile number (message match)', async () => {
      const error = Object.assign(new Error("'To' number: +49159013XXXX, is not a valid mobile number"), { code: 60200 });
      const create = jest.fn().mockRejectedValue(error);
      const provider = makeProvider(create);
      await expect(provider.startVerification(MOCK_CTX, '+49159013XXXX')).rejects.toBeInstanceOf(InvalidPhoneNumberException);
    });

    it('throws InvalidPhoneNumberException for Twilio error code 21211 (invalid To number)', async () => {
      const error = Object.assign(new Error('Invalid To phone number'), { code: 21211 });
      const create = jest.fn().mockRejectedValue(error);
      const provider = makeProvider(create);
      await expect(provider.startVerification(MOCK_CTX, '+00000000000')).rejects.toBeInstanceOf(InvalidPhoneNumberException);
    });

    it('throws InvalidPhoneNumberException for Twilio error code 21614 (not a mobile number)', async () => {
      const error = Object.assign(new Error('To number is not a mobile number'), { code: 21614 });
      const create = jest.fn().mockRejectedValue(error);
      const provider = makeProvider(create);
      await expect(provider.startVerification(MOCK_CTX, '+12025550001')).rejects.toBeInstanceOf(InvalidPhoneNumberException);
    });

    it('re-throws non-phone errors as-is', async () => {
      const error = Object.assign(new Error('Authentication failed'), { code: 20003 });
      const create = jest.fn().mockRejectedValue(error);
      const provider = makeProvider(create);
      await expect(provider.startVerification(MOCK_CTX, '+5491112345678')).rejects.not.toBeInstanceOf(InvalidPhoneNumberException);
      await expect(provider.startVerification(MOCK_CTX, '+5491112345678')).rejects.toMatchObject({ code: 20003 });
    });
  });
});
