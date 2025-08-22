# CardVault Multi-Tenant Testing & QA Notes

## Testing Questions
- [ ] How should Global Admins handle organization deactivation/suspension?
- [ ] Should Organization Admins be able to see user activity logs?
- [ ] What happens when an organization reaches its user limit?
- [ ] Should there be audit trails for user role changes?
- [ ] How should card ownership transfer when users are removed from organizations?

## Issues Found

### High Priority
- [ ] Org Admins should  have the System Menu
- [ ] All cards in an Organization are owned by the Organization.  Removing a user simply removes thier access to CardVault and removes them from the Organization.
- [ ] Deactivation/suspension of an organization should envoke the backup of the organizations cards and remove those entries from the database.
- [ ] Global Admins should have a dashboard showing current database size and system size with warnings on disk space available.
- [ ] When an organization reaches its user limit, they should not be able to add more users without removing a user.
- [ ] There should be an audit trail for user role changes.

### Medium Priority
- [ ] Does the Backup Database and Backup Images only backup items from that Organization, it should
- [ ] Under System Management, Full System Backup should only be available for Global_Admins
- [ ] User Management, there should only be 2 types of users, User and Admin.
- [ ] Organization Admins should see user activity.
- [ ] Users should have the ability to change their own password when logged into the application.
- [ ] There should be a forgot password item on the login page with verification based on email associated with the user account in the system.

### Low Priority / Nice to Have
- [ ] Possible Branding for login page per organization.  Maybe a logo and color scheme changes.  CardVault should still be visible somewhere on the login page.

## Test Cases Completed
- [x] Basic authentication flow (Global Admin, Organization Admin, User)
- [x] Organization creation and management
- [x] User creation and role assignment
- [x] Navigation menu role-based display
- [x] Tenant context switching for Global Admins
- [x] System menu access for Global Admins
- [x] Organization count display accuracy

## Test Cases Pending
- [ ] End-to-end card management within organizations
- [ ] User permission boundaries (ensure users can't access other orgs)
- [ ] Organization Admin restrictions (can't see global system features)
- [ ] Error handling for network/database issues
- [ ] Session timeout and re-authentication
- [ ] Organization user limit enforcement
- [ ] Role change effects on existing sessions
- [ ] Backup and restore functionality
- [ ] Performance with multiple organizations and users

## Browser Compatibility Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Performance Notes
- [ ] Page load times
- [ ] Database query performance
- [ ] Memory usage during extended sessions

## Security Testing
- [ ] Cross-organization data access attempts
- [ ] Role privilege escalation attempts
- [ ] Session hijacking resistance
- [ ] SQL injection protection
- [ ] XSS protection

## Accessibility Testing
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast compliance
- [ ] Mobile responsiveness

## Notes & Observations
- Development server currently running on port 3001
- RLS policies temporarily disabled for functionality (needs re-enabling)
- PostgreSQL multi-tenant architecture working correctly
- Hierarchical permission system functioning as designed

## Test Environment Details
- **URL**: http://localhost:3001
- **Database**: PostgreSQL (cardvault_dev)
- **Test Accounts**:
  - Global Admin: global_admin / admin123
  - Org Admin (Acme Corp): donnie / [password]
  - Regular User: [to be created during testing]

---
*Last Updated: 2025-08-14*
*Multi-Tenant Implementation Status: ~95% Complete*
