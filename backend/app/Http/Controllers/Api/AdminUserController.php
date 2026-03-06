<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminUserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::with('media')->orderBy('created_at', 'desc')->get();
        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'in:customer,owner,admin'],
            'phone' => ['required_if:role,customer,owner', 'string', 'max:30'],
        ];

        if ($request->input('role') === 'owner') {
            $rules['id_image'] = ['required', 'image', 'max:2048'];
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $role = $request->role;
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $role !== 'admin' ? $request->input('phone') : null,
            'password' => Hash::make($request->password),
            'role' => $role,
        ]);

        if ($request->hasFile('id_image')) {
            $user->addMediaFromRequest('id_image')->toMediaCollection('id-image');
        }

        $user->load('media');

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user,
        ], 201);
    }
}
