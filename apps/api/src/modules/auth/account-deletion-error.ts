import {ConflictException} from '@nestjs/common';

/** Referenced editorial/history records must not be deleted to make account removal pass. */
export function accountDeletionError(error: unknown): never {
  if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
    throw new ConflictException('Tài khoản còn lịch sử biên tập, tài liệu hoặc dữ liệu liên quan cần được xử lý trước khi xóa. Vui lòng liên hệ quản trị.');
  }
  throw error;
}
