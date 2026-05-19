# Firebase Security Specification - CyberPhone

## 1. Data Invariants
- **User Privacy**: `profiles/{userId}` is strictly for the owner. `public_profiles/{userId}` is readable by everyone but writable by the owner.
- **Posts**: Users can only create/edit/delete their own posts.
- **Chats**: Only participants can read/write messages in a conversation.
- **Monetization**: Budget and spend in `ads` can only be updated by the system or carefully constrained actions.
- **Transactions**: Financial records are immutable after creation and only readable by the owner.
- **Notifications**: Only the recipient can read and mark as read.
- **Stores/Products**: Only the store owner can manage their store and products.

## 2. The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Creating a post with `userId` of another user.
2. **Shadow Field Injection**: Adding `isVerified: true` to a profile update.
3. **PII Leakage**: A user trying to read `profiles/{otherUserId}`.
4. **Rate Limit Bypass (ID Poisoning)**: Creating a document with a 2MB string as an ID.
5. **Unauthorized Transaction**: User A trying to create a transaction on behalf of User B.
6. **Chat Snooping**: User A trying to read `chats/{chatId}` where they are not a participant.
7. **Ad Budget Hijack**: User A trying to update the `budget` of User B's ad campaign.
8. **Orphaned Record**: Creating a comment on a `postId` that doesn't exist.
9. **Timestamp Fraud**: Setting a future `timestamp` on a post manually from the client.
10. **State Skipping**: Updating a shop order status from `PROCESSING` straight to `COMPLETED` without being the carrier/seller.
11. **Mass Delete**: An authenticated user trying to delete all notifications in the collection.
12. **Self-Promotion**: An unverified user trying to set `monetizationStatus: 'APPROVED'`.

## 3. Test Runner Mockup (Verification Plan)
Security verification will focus on ensuring the "Eight Pillars" are implemented.
- Auth check: `isSignedIn()`
- Validation check: `isValid[Entity]()`
- Identity/Role check: `existing().ownerId == request.auth.uid`
- Relational check: `get(/path/to/parent)`
