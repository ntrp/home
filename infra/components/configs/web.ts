import { CloudfrontCachePolicy } from "@cdktf/provider-aws/lib/cloudfront-cache-policy";
import {
  CloudfrontDistributionDefaultCacheBehavior,
  CloudfrontDistributionOrigin,
} from "@cdktf/provider-aws/lib/cloudfront-distribution";
import { CloudfrontOriginAccessControl } from "@cdktf/provider-aws/lib/cloudfront-origin-access-control";
import { CloudfrontOriginRequestPolicy } from "@cdktf/provider-aws/lib/cloudfront-origin-request-policy";
import { CloudfrontResponseHeadersPolicy } from "@cdktf/provider-aws/lib/cloudfront-response-headers-policy";
import { Construct } from "constructs";
import { APP } from "../const";

const frontendOriginId = "frontend";

export const frontendOrigin = (
  scope: Construct,
  env: string,
  bucketRegionalDomainName: string,
): CloudfrontDistributionOrigin => {
  const aoc = new CloudfrontOriginAccessControl(scope, "frontend-aoc", {
    name: `${APP}-${env}-home-frontend`,
    originAccessControlOriginType: "s3",
    signingBehavior: "always",
    signingProtocol: "sigv4",
  });

  return {
    originId: frontendOriginId,
    domainName: bucketRegionalDomainName,
    originAccessControlId: aoc.id,
  };
};

export const frontendCacheBehaviour = (
  scope: Construct,
  env: string,
): CloudfrontDistributionDefaultCacheBehavior => {
  return {
    targetOriginId: frontendOriginId,
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD"],
    compress: true,
    viewerProtocolPolicy: "redirect-to-https",
    cachePolicyId: cachePolicy(scope, env).id,
    originRequestPolicyId: originRequest(scope, env).id,
    responseHeadersPolicyId: responseHeaders(scope, env).id,
  };
};

const cachePolicy = (scope: Construct, env: string) =>
  new CloudfrontCachePolicy(scope, "frontend-cache-policy", {
    name: `${APP}-${env}-home-frontend`,
    defaultTtl: 1,
    minTtl: 1,
    maxTtl: 1,
    parametersInCacheKeyAndForwardedToOrigin: {
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      cookiesConfig: {
        cookieBehavior: "none",
      },
      headersConfig: {
        headerBehavior: "none",
      },
      queryStringsConfig: {
        queryStringBehavior: "none",
      },
    },
  });

const originRequest = (scope: Construct, env: string) =>
  new CloudfrontOriginRequestPolicy(scope, "frontend-origin-request-policy", {
    name: `${APP}-${env}-home-frontend`,
    cookiesConfig: {
      cookieBehavior: "none",
    },
    headersConfig: {
      headerBehavior: "none",
    },
    queryStringsConfig: {
      queryStringBehavior: "none",
    },
  });

const responseHeaders = (scope: Construct, env: string) =>
  new CloudfrontResponseHeadersPolicy(
    scope,
    "frontend-response-headers-policy",
    {
      name: `${APP}-${env}-home-frontend`,
      corsConfig: {
        accessControlAllowCredentials: false,
        accessControlMaxAgeSec: 3600,
        accessControlAllowOrigins: {
          items: ["*"],
          // items: [`${env.portal.domain}.${env.portal.zone.name}`],
        },
        accessControlAllowHeaders: {
          items: ["*"],
        },
        accessControlAllowMethods: {
          items: ["GET"],
        },
        accessControlExposeHeaders: {
          items: ["ETag"],
        },
        originOverride: true,
      },
      securityHeadersConfig: {
        contentTypeOptions: {
          override: true,
        },
        frameOptions: {
          frameOption: "DENY",
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: "same-origin",
          override: true,
        },
        xssProtection: {
          modeBlock: true,
          protection: true,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAgeSec: 63072000,
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentSecurityPolicy: {
          contentSecurityPolicy: "frame-ancestors 'none'",
          override: true,
        },
      },
      customHeadersConfig: {
        items: [
          {
            header: 'Permissions-Policy',
            value:
              'accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), sync-xhr=(), usb=(), xr-spatial-tracking=()',
            override: true,
          },
        ],
      },
    },
  );
