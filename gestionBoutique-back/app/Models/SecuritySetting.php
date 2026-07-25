<?php
// app/Models/SecuritySetting.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class SecuritySetting extends Model
{
    protected $fillable = ['pin_hash', 'updated_by'];

    public static function current(): self
    {
        return static::findOrFail(1);
    }

    public function verifyPin(string $pin): bool
    {
        return Hash::check($pin, $this->pin_hash);
    }
}