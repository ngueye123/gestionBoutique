<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SecurityPinController extends SecuritySettingController
{
    public function create_pin(Request $request)
    {
        return parent::create_pin($request);
    }
}
