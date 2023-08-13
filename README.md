# Heroku Deployment Git Repository

This repository is dedicated to the deployment of our project on Heroku. To maintain a structured and organized workflow, we follow a specific branching and commit strategy. This strategy helps us ensure that the codebase remains stable and reliable on both development and production environments.

## Branching Strategy

We use two primary branches in this repository:

1. **dev**: This is the development branch. All ongoing development work should be done in this branch. It's the branch where new features are implemented, bug fixes are made, and continuous integration is tested.

2. **master**: This is the production branch. The code in this branch is considered stable and ready for deployment. Only tested and verified changes from the **dev** branch should be merged into the **master** branch.

## Commit Guidelines

Follow these guidelines when committing changes to this repository:

### Committing to the dev Branch

1. **Feature Implementation**: When working on a new feature or enhancement, create a new branch off the **dev** branch. Name the branch descriptively (e.g., `feature/user-authentication`).

2. **Bug Fixes**: For bug fixes, create a new branch off the **dev** branch and name it appropriately (e.g., `bugfix/navbar-overlay`).

3. **Commit Messages**: Write clear and concise commit messages. Each commit should represent a single logical change. Use present tense and provide a brief description of the change. For example:
   ```
   Add user authentication functionality
   ```

4. **Regular Commits**: Make frequent commits as you work. This helps in maintaining a clear history and makes it easier to review and understand changes.

5. **Pull Requests**: When your work on a feature or bug fix is complete, create a pull request from your feature branch to the **dev** branch. Mention any relevant team members for review.

### Merging to the master Branch

1. **Code Review**: Before merging into the **master** branch, changes must be reviewed and approved by at least one team member.

2. **Continuous Integration**: Ensure that your changes pass all continuous integration tests before merging into the **master** branch.

3. **Version Tagging**: After merging into the **master** branch, create a version tag using semantic versioning (e.g., `v1.0.0`). Tagging helps in tracking stable releases.

4. **Deployment**: The **master** branch is considered the production-ready branch. Deploy the tagged version from the **master** branch to the production environment on Heroku.

## Summary

Following this branching and commit strategy ensures a structured workflow and helps us maintain a reliable and stable deployment on Heroku. By keeping development and production code separate and well-managed, we can efficiently manage our project's lifecycle.
