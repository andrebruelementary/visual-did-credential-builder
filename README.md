# Visual DID & Credential Builder

A no-code tool to create, manage, and issue decentralized digital identities (DIDs) and verifiable credentials, built for the Cardano Identus PRISM platform.

## Overview

The Visual DID & Credential Builder provides an intuitive graphical user interface that enables non-developers to participate in the decentralized identity ecosystem. This project emerged from the need to make DID technology accessible to everyone, not just developers.

As pointed out in our Catalyst proposal: "Adoption and market-share is not achieved by developers, but the number of non-technical users using the technology on a daily basis."

## Project Vision

This tool abstracts away technological details and intricacies, allowing users to focus on the benefits and practical applications of decentralized identity. It empowers:

- **Sports club managers** issuing membership credentials
- **University professors** sending digital course completion certificates
- **Businesses** participating in global supply chain verification
- **Healthcare providers** issuing verifiable medical records
- ...and many more use cases

## Key Features

- Create and manage DIDs with an intuitive graphical interface
- Browse, select, and customize credential templates
- Create your own credential templates with a visual builder
- Issue verifiable credentials to contacts
- Access both private and public template repositories
- Suggest your templates for inclusion in the public repository

## About Decentralized Identities

DIDs and credentials are the digital versions of physical identification documents like passports and driver's licenses. While these physical documents work in the real world, they cannot easily be used as proof online.

- The **DID** is your digital identity to which you can receive digital proofs
- **Verifiable credentials** are digital versions of physical credentials in a form that can be used in the digital world

## Current Status

This repository contains a demonstration browser extension implementation showing how credential templates can be structured and used. The project is designed as a starting point for developers working on digital identity solutions based on the Atala PRISM platform.

The browser extension demonstrates:
- Loading credential templates from a GitHub repository
- Saving private templates to local browser storage
- Selecting contacts to issue credentials to
- Customizing credential fields
- Issuing verifiable credentials

## Template Repository Integration

The extension works with the [Verifiable Credential Templates](https://github.com/andrebruelementary/verifiable-credential-templates) repository, which contains a collection of standardized credential templates organized by category.

Benefits of this approach:
- Immediate access to high-quality templates
- Standardization across different DID implementations
- Community-vetted credential designs
- Continuous expansion as new templates are added

## About the Project

This project was initially proposed and funded through Project Catalyst under "F8: Accelerate Decentralized Identity" to solve the problem of needing intuitive no-code tools to ensure adoption of decentralized digital identities.

## Looking at the Code

If you'd like to review the code, clone this repository:

```
git clone https://github.com/your-username/visual-did-credential-builder.git
cd visual-did-credential-builder
```

## Contributing

We welcome contributions! The public template repository particularly needs community input to build a comprehensive library of reusable templates.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
