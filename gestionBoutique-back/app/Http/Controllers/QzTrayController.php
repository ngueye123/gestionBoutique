<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use phpseclib3\Crypt\PublicKeyLoader;

class QzTrayController extends Controller
{
    public function certificate()
    {
        return response(file_get_contents(storage_path('app/qz/digital-certificate.txt')))
            ->header('Content-Type', 'text/plain');
    }

    public function sign(Request $request)
    {
        $request->validate(['toSign' => 'required|string']);

        $privateKey = PublicKeyLoader::loadPrivateKey(
            file_get_contents(storage_path('app/qz/private-key.pem'))
        );
        $signature = $privateKey->sign($request->input('toSign'), 'sha512');

        return response(base64_encode($signature));
    }
}