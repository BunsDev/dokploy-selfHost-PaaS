-- Custom SQL migration file, put your code below! --

WITH inserted_users AS (
    -- Insertar usuarios desde admins
    INSERT INTO user_temp (
        id,
        email,
        token,
        "email_verified",
        "updated_at",
        role,
        "serverIp",
        image,
        "certificateType",
        host,
        "letsEncryptEmail",
        "sshPrivateKey",
        "enableDockerCleanup",
        "enableLogRotation",
        "enablePaidFeatures",
        "metricsConfig",
        "cleanupCacheApplications",
        "cleanupCacheOnPreviews",
        "cleanupCacheOnCompose",
        "stripeCustomerId",
        "stripeSubscriptionId",
        "serversQuantity",
        "expirationDate",
        "createdAt"
    )
    SELECT 
        a."adminId",
        auth.email,
        COALESCE(auth.token, ''),
        true,
        CURRENT_TIMESTAMP,
        'admin',
        a."serverIp",
        auth.image,
        a."certificateType",
        a.host,
        a."letsEncryptEmail",
        a."sshPrivateKey",
        a."enableDockerCleanup",
        a."enableLogRotation",
        a."enablePaidFeatures",
        a."metricsConfig",
        a."cleanupCacheApplications",
        a."cleanupCacheOnPreviews",
        a."cleanupCacheOnCompose",
        a."stripeCustomerId",
        a."stripeSubscriptionId",
        a."serversQuantity",
        NOW() + INTERVAL '1 year',
        NOW()
    FROM admin a
    JOIN auth ON auth.id = a."authId"
    RETURNING *
),
inserted_accounts AS (
    -- Insertar cuentas para los admins
    INSERT INTO account (
        id,
        "account_id",
        "provider_id",
        "user_id",
        password,
        "is2FAEnabled",
        "created_at",
        "updated_at"
    )
    SELECT 
        gen_random_uuid(),
        gen_random_uuid(),
        'credential',
        a."adminId",
        auth.password,
        COALESCE(auth."is2FAEnabled", false),
        NOW(),
        NOW()
    FROM admin a
    JOIN auth ON auth.id = a."authId"
    RETURNING *
),
inserted_orgs AS (
    -- Crear organizaciones para cada admin
    INSERT INTO organization (
        id,
        name,
        slug,
        "owner_id",
        "created_at"
    )
    SELECT 
        gen_random_uuid(),
        'My Organization',
        -- Generamos un slug único usando una función de hash
        encode(sha256((a."adminId" || CURRENT_TIMESTAMP)::bytea), 'hex'),
        a."adminId",
        NOW()
    FROM admin a
    RETURNING *
),
inserted_members AS (
    -- Insertar usuarios miembros
    INSERT INTO user_temp (
        id,
        email,
        token,
        "email_verified",
        "updated_at",
        role,
        image,
        "createdAt",
        "canAccessToAPI",
        "canAccessToDocker",
        "canAccessToGitProviders",
        "canAccessToSSHKeys",
        "canAccessToTraefikFiles",
        "canCreateProjects",
        "canCreateServices",
        "canDeleteProjects",
        "canDeleteServices",
        "accesedProjects",
        "accesedServices",
        "expirationDate"
    )
    SELECT 
        u."userId",
        auth.email,
        COALESCE(u.token, ''),
        true,
        CURRENT_TIMESTAMP,
        'user',
        auth.image,
        NOW(),
        COALESCE(u."canAccessToAPI", false),
        COALESCE(u."canAccessToDocker", false),
        COALESCE(u."canAccessToGitProviders", false),
        COALESCE(u."canAccessToSSHKeys", false),
        COALESCE(u."canAccessToTraefikFiles", false),
        COALESCE(u."canCreateProjects", false),
        COALESCE(u."canCreateServices", false),
        COALESCE(u."canDeleteProjects", false),
        COALESCE(u."canDeleteServices", false),
        COALESCE(u."accesedProjects", '{}'),
        COALESCE(u."accesedServices", '{}'),
        NOW() + INTERVAL '1 year'
    FROM "user" u
    JOIN admin a ON u."adminId" = a."adminId"
    JOIN auth ON auth.id = u."authId"
    RETURNING *
),
inserted_member_accounts AS (
    -- Insertar cuentas para los usuarios miembros
    INSERT INTO account (
        id,
        "account_id",
        "provider_id",
        "user_id",
        password,
        "is2FAEnabled",
        "created_at",
        "updated_at"
    )
    SELECT 
        gen_random_uuid(),
        gen_random_uuid(),
        'credential',
        u."userId",
        auth.password,
        COALESCE(auth."is2FAEnabled", false),
        NOW(),
        NOW()
    FROM "user" u
    JOIN admin a ON u."adminId" = a."adminId"
    JOIN auth ON auth.id = u."authId"
    RETURNING *
)
-- Insertar miembros en las organizaciones
INSERT INTO member (
    id,
    "organization_id",
    "user_id",
    role,
    "created_at"
)
SELECT 
    gen_random_uuid(),
    o.id,
    u."userId",
    'admin',
    NOW()
FROM "user" u
JOIN admin a ON u."adminId" = a."adminId"
JOIN inserted_orgs o ON o."owner_id" = a."adminId";