import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample users
  const hashedPassword = await bcrypt.hash('SecurePassword123!', 12);

  // Create individual users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'System Administrator',
        password: hashedPassword,
        userType: 'INDIVIDUAL',
        profession: 'Administrator',
        preferences: {
          create: {
            theme: 'system',
            language: 'en',
            emailNotifications: true,
            pushNotifications: true,
            autoSync: true,
            defaultVisibility: 'PRIVATE',
            aiSuggestions: true
          }
        }
      },
      include: { preferences: true }
    }),

    prisma.user.upsert({
      where: { email: 'student@university.edu' },
      update: {},
      create: {
        email: 'student@university.edu',
        name: 'John Student',
        password: hashedPassword,
        userType: 'INDIVIDUAL',
        profession: 'Student',
        preferences: {
          create: {
            theme: 'light',
            language: 'en',
            emailNotifications: true,
            pushNotifications: true,
            autoSync: true,
            defaultVisibility: 'PRIVATE',
            aiSuggestions: true
          }
        }
      },
      include: { preferences: true }
    }),

    prisma.user.upsert({
      where: { email: 'teacher@university.edu' },
      update: {},
      create: {
        email: 'teacher@university.edu',
        name: 'Dr. Sarah Wilson',
        password: hashedPassword,
        userType: 'INDIVIDUAL',
        profession: 'Professor',
        preferences: {
          create: {
            theme: 'system',
            language: 'en',
            emailNotifications: true,
            pushNotifications: false,
            autoSync: true,
            defaultVisibility: 'ORGANIZATION',
            aiSuggestions: true
          }
        }
      },
      include: { preferences: true }
    }),

    prisma.user.upsert({
      where: { email: 'engineer@techcorp.com' },
      update: {},
      create: {
        email: 'engineer@techcorp.com',
        name: 'Mike Chen',
        password: hashedPassword,
        userType: 'INDIVIDUAL',
        profession: 'Software Engineer',
        preferences: {
          create: {
            theme: 'dark',
            language: 'en',
            emailNotifications: false,
            pushNotifications: true,
            autoSync: true,
            defaultVisibility: 'ORGANIZATION',
            aiSuggestions: true
          }
        }
      },
      include: { preferences: true }
    }),

    prisma.user.upsert({
      where: { email: 'hr@startup.io' },
      update: {},
      create: {
        email: 'hr@startup.io',
        name: 'Lisa Rodriguez',
        password: hashedPassword,
        userType: 'INDIVIDUAL',
        profession: 'HR Manager',
        preferences: {
          create: {
            theme: 'light',
            language: 'en',
            emailNotifications: true,
            pushNotifications: true,
            autoSync: true,
            defaultVisibility: 'ORGANIZATION',
            aiSuggestions: true
          }
        }
      },
      include: { preferences: true }
    })
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create sample organizations
  const university = await prisma.organization.upsert({
    where: { slug: 'tech-university' },
    update: {},
    create: {
      name: 'Tech University',
      slug: 'tech-university',
      description: 'Leading technology university focused on innovation and research',
      type: 'EDUCATIONAL',
      members: {
        create: [
          {
            userId: users[1].id, // John Student
            role: 'MEMBER'
          },
          {
            userId: users[2].id, // Dr. Sarah Wilson
            role: 'ADMIN'
          }
        ]
      }
    }
  });

  const techCorp = await prisma.organization.upsert({
    where: { slug: 'techcorp' },
    update: {},
    create: {
      name: 'TechCorp Solutions',
      slug: 'techcorp',
      description: 'Enterprise software development company',
      type: 'COMPANY',
      members: {
        create: [
          {
            userId: users[3].id, // Mike Chen
            role: 'OWNER'
          }
        ]
      }
    }
  });

  const startup = await prisma.organization.upsert({
    where: { slug: 'innovative-startup' },
    update: {},
    create: {
      name: 'Innovative Startup',
      slug: 'innovative-startup',
      description: 'AI-powered solutions for modern businesses',
      type: 'COMPANY',
      members: {
        create: [
          {
            userId: users[4].id, // Lisa Rodriguez
            role: 'ADMIN'
          }
        ]
      }
    }
  });

  console.log('✅ Created 3 organizations');

  // Create sample folders
  const folders = await Promise.all([
    // University folders
    prisma.folder.create({
      data: {
        name: 'Computer Science',
        description: 'Computer Science department documents',
        userId: users[2].id,
        organizationId: university.id,
        visibility: 'ORGANIZATION',
        color: '#3B82F6'
      }
    }),
    prisma.folder.create({
      data: {
        name: 'Student Assignments',
        description: 'Assignment submissions and feedback',
        userId: users[1].id,
        organizationId: university.id,
        visibility: 'PRIVATE',
        color: '#10B981'
      }
    }),

    // TechCorp folders
    prisma.folder.create({
      data: {
        name: 'Engineering Docs',
        description: 'Technical specifications and architecture documents',
        userId: users[3].id,
        organizationId: techCorp.id,
        visibility: 'ORGANIZATION',
        color: '#8B5CF6'
      }
    }),
    prisma.folder.create({
      data: {
        name: 'Project Alpha',
        description: 'Confidential project documentation',
        userId: users[3].id,
        organizationId: techCorp.id,
        visibility: 'SHARED',
        color: '#F59E0B'
      }
    }),

    // Startup folders
    prisma.folder.create({
      data: {
        name: 'HR Policies',
        description: 'Human resources policies and procedures',
        userId: users[4].id,
        organizationId: startup.id,
        visibility: 'ORGANIZATION',
        color: '#EF4444'
      }
    }),

    // Personal folders
    prisma.folder.create({
      data: {
        name: 'Personal Documents',
        description: 'Personal file storage',
        userId: users[0].id,
        visibility: 'PRIVATE',
        color: '#6B7280'
      }
    })
  ]);

  console.log(`✅ Created ${folders.length} folders`);

  // Create sample documents
  const documents = await Promise.all([
    // University documents
    prisma.document.create({
      data: {
        filename: 'CS101_Syllabus.pdf',
        originalPath: '/uploads/demo/cs101_syllabus.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: BigInt(245760), // 240KB
        channel: 'WEB_UPLOAD',
        department: 'ACADEMIC',
        userId: users[2].id,
        organizationId: university.id,
        folderId: folders[0].id,
        tags: ['syllabus', 'computer-science', 'course-material'],
        visibility: 'ORGANIZATION',
        status: 'COMPLETED',
        extractedText: 'CS101 Introduction to Computer Science. Course objectives, schedule, and requirements...',
        metaData: {
          course: 'CS101',
          semester: 'Fall 2024',
          instructor: 'Dr. Sarah Wilson'
        }
      }
    }),

    prisma.document.create({
      data: {
        filename: 'Assignment1_DataStructures.docx',
        originalPath: '/uploads/demo/assignment1.docx',
        fileType: 'docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: BigInt(156432),
        channel: 'WEB_UPLOAD',
        department: 'ACADEMIC',
        userId: users[1].id,
        organizationId: university.id,
        folderId: folders[1].id,
        tags: ['assignment', 'data-structures', 'homework'],
        visibility: 'PRIVATE',
        status: 'COMPLETED',
        extractedText: 'Assignment 1: Implement basic data structures including arrays, linked lists, and stacks...',
        metaData: {
          dueDate: '2024-10-15',
          course: 'CS201',
          grade: 'A-'
        }
      }
    }),

    // TechCorp documents
    prisma.document.create({
      data: {
        filename: 'System_Architecture_v2.1.pdf',
        originalPath: '/uploads/demo/system_architecture.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: BigInt(1048576), // 1MB
        channel: 'WEB_UPLOAD',
        department: 'ENGINEERING',
        userId: users[3].id,
        organizationId: techCorp.id,
        folderId: folders[2].id,
        tags: ['architecture', 'system-design', 'technical-spec'],
        visibility: 'ORGANIZATION',
        status: 'COMPLETED',
        extractedText: 'System Architecture Document v2.1. Microservices architecture with containerized deployment...',
        metaData: {
          version: '2.1',
          project: 'Platform Redesign',
          reviewedBy: 'Architecture Team'
        }
      }
    }),

    prisma.document.create({
      data: {
        filename: 'API_Documentation.md',
        originalPath: '/uploads/demo/api_docs.md',
        fileType: 'md',
        mimeType: 'text/markdown',
        fileSize: BigInt(89324),
        channel: 'WEB_UPLOAD',
        department: 'ENGINEERING',
        userId: users[3].id,
        organizationId: techCorp.id,
        folderId: folders[3].id,
        tags: ['api', 'documentation', 'developer-guide'],
        visibility: 'SHARED',
        status: 'COMPLETED',
        extractedText: 'REST API Documentation. Authentication endpoints, user management, and data access patterns...',
        metaData: {
          apiVersion: 'v1.0',
          lastUpdated: '2024-09-26'
        }
      }
    }),

    // Startup documents
    prisma.document.create({
      data: {
        filename: 'Employee_Handbook_2024.pdf',
        originalPath: '/uploads/demo/employee_handbook.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: BigInt(678432),
        channel: 'WEB_UPLOAD',
        department: 'HR',
        userId: users[4].id,
        organizationId: startup.id,
        folderId: folders[4].id,
        tags: ['handbook', 'policies', 'hr', 'onboarding'],
        visibility: 'ORGANIZATION',
        status: 'COMPLETED',
        extractedText: 'Employee Handbook 2024. Company policies, benefits, code of conduct, and procedures...',
        metaData: {
          version: '2024.1',
          effectiveDate: '2024-01-01',
          department: 'Human Resources'
        }
      }
    }),

    // Personal document
    prisma.document.create({
      data: {
        filename: 'Personal_Resume.pdf',
        originalPath: '/uploads/demo/resume.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileSize: BigInt(234567),
        channel: 'WEB_UPLOAD',
        department: 'GENERAL',
        userId: users[0].id,
        folderId: folders[5].id,
        tags: ['resume', 'cv', 'personal'],
        visibility: 'PRIVATE',
        status: 'COMPLETED',
        extractedText: 'John Doe - System Administrator. Experience in database management, system security...',
        metaData: {
          lastUpdated: '2024-09-15',
          type: 'Professional Resume'
        }
      }
    })
  ]);

  console.log(`✅ Created ${documents.length} documents`);

  // Create sample document shares
  const shares = await Promise.all([
    prisma.documentShare.create({
      data: {
        documentId: documents[2].id, // System Architecture
        sharedWith: users[4].id, // Lisa Rodriguez
        sharedBy: users[3].id, // Mike Chen
        permissions: 'READ'
      }
    }),
    prisma.documentShare.create({
      data: {
        documentId: documents[3].id, // API Documentation
        sharedWith: users[4].id, // Lisa Rodriguez
        sharedBy: users[3].id, // Mike Chen
        permissions: 'WRITE'
      }
    })
  ]);

  console.log(`✅ Created ${shares.length} document shares`);

  // Create sample integrations
  const integrations = await Promise.all([
    prisma.userIntegration.create({
      data: {
        userId: users[2].id, // Dr. Sarah Wilson
        type: 'GOOGLE_DRIVE',
        name: 'University Google Drive',
        isActive: true,
        settings: {
          email: 'teacher@university.edu',
          folderId: 'university-docs-folder'
        }
      }
    }),
    prisma.userIntegration.create({
      data: {
        userId: users[3].id, // Mike Chen
        type: 'SLACK',
        name: 'TechCorp Slack',
        isActive: true,
        settings: {
          workspaceId: 'T1234567890',
          channel: '#documents'
        }
      }
    }),
    prisma.userIntegration.create({
      data: {
        userId: users[4].id, // Lisa Rodriguez
        type: 'OUTLOOK',
        name: 'Startup Email',
        isActive: true,
        settings: {
          email: 'hr@startup.io'
        }
      }
    })
  ]);

  console.log(`✅ Created ${integrations.length} integrations`);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📋 Sample Data Created:');
  console.log(`   👥 Users: ${users.length}`);
  console.log(`   🏢 Organizations: 3`);
  console.log(`   📁 Folders: ${folders.length}`);
  console.log(`   📄 Documents: ${documents.length}`);
  console.log(`   🔗 Shares: ${shares.length}`);
  console.log(`   🔌 Integrations: ${integrations.length}`);
  
  console.log('\n🔑 Sample Login Credentials:');
  console.log('   Admin: admin@example.com / SecurePassword123!');
  console.log('   Student: student@university.edu / SecurePassword123!');
  console.log('   Teacher: teacher@university.edu / SecurePassword123!');
  console.log('   Engineer: engineer@techcorp.com / SecurePassword123!');
  console.log('   HR Manager: hr@startup.io / SecurePassword123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });