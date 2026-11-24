import { beforeEach } from 'bun:test';
import { resetAllRateLimiters } from '../src/app/middleware/rate-limit';

beforeEach(() => {
  resetAllRateLimiters();
});
