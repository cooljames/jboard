import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  getMenuPermissions,
  saveMenuPermissions,
  USER_GRADES,
  DEFAULT_MENU_PERMISSIONS,
  MenuItemPermission,
} from '@/lib/menu-permissions';

export async function GET() {
  try {
    const permissions = getMenuPermissions();
    return NextResponse.json({
      permissions,
      grades: USER_GRADES,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        permissions: DEFAULT_MENU_PERMISSIONS,
        grades: USER_GRADES,
        error: err.message,
      },
      { status: 200 }
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const body = await request.json();
    const { action, permissions } = body;

    // Reset to defaults
    if (action === 'reset') {
      const ok = saveMenuPermissions(DEFAULT_MENU_PERMISSIONS);
      return NextResponse.json({
        success: ok,
        message: '메뉴 접근 권한이 시스템 기본값으로 복원되었습니다.',
        permissions: getMenuPermissions(),
      });
    }

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'permissions 배열이 필요합니다.' }, { status: 400 });
    }

    const ok = saveMenuPermissions(permissions as MenuItemPermission[]);
    if (ok) {
      return NextResponse.json({
        success: true,
        message: '등급별 메뉴 접근 권한이 성공적으로 저장되었습니다.',
        permissions: getMenuPermissions(),
      });
    } else {
      return NextResponse.json({ error: '권한 저장에 실패했습니다.' }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
