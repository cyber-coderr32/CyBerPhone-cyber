import React from 'react';

export enum ConfirmationType {
  DELETE = 'DELETE',
  LEAVE = 'LEAVE',
  BLOCK = 'BLOCK',
  UNFOLLOW = 'UNFOLLOW',
  LOGOUT = 'LOGOUT',
  DANGER = 'DANGER'
}

const ConfirmationModal: React.FC<any> = () => <div>Confirmation Modal Stub</div>;
export default ConfirmationModal;
