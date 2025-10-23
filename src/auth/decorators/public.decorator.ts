import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const SKIP_CSRF_KEY = "skipCsrf";
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
