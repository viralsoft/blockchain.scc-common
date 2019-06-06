const Const = {
  SATOSHI_FACTOR: 100000000,

  MAX_ENCRYPTED_PRIVATE_KEY_LENGTH: 250,

  TOKEN_SEPARATOR: ',',

  PROCESSED_BLOCK_TYPE: {
    DEPOSIT: 'deposit',
  },

  WEBHOOK_EVENT: {
    DEPOSIT: 'deposit',
    DROP: 'drop',
  },

  WITHDRAWAL_PROCESS: {
    PICKER: 'picker',
    SENDER: 'sender',
    SIGNER: 'signer',
    VERIFIER: 'verifier',
  },
  WITHDRAWAL_STATUS: {
    COMPLETED: 'completed',
    FAILED: 'failed',
    SENT: 'sent',
    SIGNED: 'signed',
    SIGNING: 'signing',
    UNSIGNED: 'unsigned',
  },
};

export { Const };
