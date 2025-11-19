/**
 * Database seeding script for development
 */

import { prisma } from './index';
import { runPostDeploymentMigrations } from './migrations';

async function seed() {
  console.log('Starting database seed...');

  try {
    // Run post-deployment migrations first
    await runPostDeploymentMigrations();

    // Create demo tenant
    const tenant = await prisma.tenant.upsert({
      where: { slug: 'acme-corp' },
      update: {},
      create: {
        name: 'Acme Corporation',
        slug: 'acme-corp',
        pqcEnabled: true,
        settings: {
          maxFileSize: 524288000, // 500MB
          allowedFileTypes: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md'],
        },
      },
    });

    console.log('✓ Created tenant:', tenant.name);

    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: 'admin@acme.com',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'admin@acme.com',
        fullName: 'Admin User',
        role: 'admin',
        mfaEnabled: true,
      },
    });

    console.log('✓ Created admin user:', adminUser.email);

    // Create additional users
    const managerUser = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: 'manager@acme.com',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'manager@acme.com',
        fullName: 'Manager User',
        role: 'manager',
        mfaEnabled: false,
      },
    });

    const contributorUser = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: 'contributor@acme.com',
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'contributor@acme.com',
        fullName: 'Contributor User',
        role: 'contributor',
        mfaEnabled: false,
      },
    });

    console.log('✓ Created additional users');

    // Create workspaces
    const generalWorkspace = await prisma.workspace.create({
      data: {
        tenantId: tenant.id,
        name: 'General',
        description: 'General workspace for company-wide documents',
        classification: 'internal',
        createdBy: adminUser.id,
      },
    });

    const legalWorkspace = await prisma.workspace.create({
      data: {
        tenantId: tenant.id,
        name: 'Legal',
        description: 'Legal documents and contracts',
        classification: 'confidential',
        createdBy: adminUser.id,
      },
    });

    const engineeringWorkspace = await prisma.workspace.create({
      data: {
        tenantId: tenant.id,
        name: 'Engineering',
        description: 'Technical documentation and designs',
        classification: 'restricted',
        createdBy: adminUser.id,
      },
    });

    console.log('✓ Created workspaces');

    // Create compliance controls
    await prisma.complianceControl.createMany({
      data: [
        {
          tenantId: tenant.id,
          framework: 'soc2',
          controlId: 'CC6.1',
          controlName: 'Logical Access Controls',
          description: 'The entity implements logical access controls',
          ownerId: adminUser.id,
          status: 'partial',
          evidenceIds: [],
        },
        {
          tenantId: tenant.id,
          framework: 'soc2',
          controlId: 'CC7.2',
          controlName: 'System Monitoring',
          description: 'The entity monitors system components',
          ownerId: managerUser.id,
          status: 'met',
          evidenceIds: [],
        },
        {
          tenantId: tenant.id,
          framework: 'cmmc',
          controlId: 'AC.1.001',
          controlName: 'Limit Access',
          description: 'Limit information system access to authorized users',
          ownerId: adminUser.id,
          status: 'not_met',
          evidenceIds: [],
        },
      ],
    });

    console.log('✓ Created compliance controls');

    // Create QBOM entries
    await prisma.qBOMEntry.createMany({
      data: [
        {
          tenantId: tenant.id,
          componentName: 'Document Storage',
          componentType: 'service',
          cryptoAlgorithms: ['AES-256-GCM', 'ML-KEM-768'],
          quantumSafe: true,
          migrationStatus: 'completed',
          scanDate: new Date(),
          metadata: {
            location: 'Azure Blob Storage',
            implementation: 'liboqs',
          },
        },
        {
          tenantId: tenant.id,
          componentName: 'Legacy PDF Library',
          componentType: 'library',
          cryptoAlgorithms: ['RSA-2048', 'SHA-256'],
          quantumSafe: false,
          migrationStatus: 'not_started',
          scanDate: new Date(),
          metadata: {
            package: 'pdf-lib@1.17.1',
            risk: 'medium',
          },
        },
      ],
    });

    console.log('✓ Created QBOM entries');

    // Create plugins
    await prisma.plugin.createMany({
      data: [
        {
          tenantId: tenant.id,
          pluginName: 'pqc-scanner',
          enabled: true,
          configuration: {
            scanFrequency: 'weekly',
            targetRepositories: ['github.com/acme/main-app'],
          },
        },
        {
          tenantId: tenant.id,
          pluginName: 'q-cmm',
          enabled: false,
          configuration: {},
        },
        {
          tenantId: tenant.id,
          pluginName: 'deep-research',
          enabled: false,
          configuration: {},
        },
      ],
    });

    console.log('✓ Created plugins');

    // Create audit logs
    await prisma.auditLog.createMany({
      data: [
        {
          tenantId: tenant.id,
          userId: adminUser.id,
          action: 'login',
          resourceType: 'user',
          resourceId: adminUser.id,
          metadata: { method: 'sso', provider: 'okta' },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        },
        {
          tenantId: tenant.id,
          userId: adminUser.id,
          action: 'create_workspace',
          resourceType: 'workspace',
          resourceId: generalWorkspace.id,
          metadata: { workspaceName: generalWorkspace.name },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        },
      ],
    });

    console.log('✓ Created audit logs');

    console.log('\n✅ Database seed completed successfully!\n');
    console.log('Demo Credentials:');
    console.log('  Admin: admin@acme.com');
    console.log('  Manager: manager@acme.com');
    console.log('  Contributor: contributor@acme.com');
    console.log('\nTenant: acme-corp\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
