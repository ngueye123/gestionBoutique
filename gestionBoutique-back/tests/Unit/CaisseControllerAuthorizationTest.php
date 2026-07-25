<?php

namespace Tests\Unit;

use App\Http\Controllers\CaisseController;
use App\Models\Employe;
use App\Services\ActorResolver;
use App\Services\CaisseService;
use App\Services\DashboardCacheService;
use Tests\TestCase;

class CaisseControllerAuthorizationTest extends TestCase
{
    public function test_admin_employee_has_patron_level_access_for_caisse():
    {
        $controller = new CaisseController(
            $this->createMock(CaisseService::class),
            $this->createMock(ActorResolver::class),
            $this->createMock(DashboardCacheService::class),
        );

        $method = new \ReflectionMethod($controller, 'estPatronOuAdmin');
        $method->setAccessible(true);

        $employe = new Employe();
        $employe->role = 'admin';

        $this->assertTrue($method->invoke($controller, $employe));
    }
}
