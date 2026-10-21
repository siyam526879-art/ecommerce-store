"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === "login") {
        const res = await signIn("credentials", { 
          email, password, redirect: false 
        });
        if (res?.ok) {
          onSuccess?.();
          onClose();
        } else {
          alert("Invalid credentials");
        }
      } else {
        // For registration, we set intent cookie and redirect
        document.cookie = "auth_intent=register; path=/; max-age=60";
        await signIn("google", { callbackUrl: "/account" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-0">
        <div className="bg-[#f85606] p-4 text-white flex justify-between items-center">
          <DialogTitle className="text-lg font-bold">
            {mode === "login" ? "Welcome Back!" : "Join Trillon Mart"}
          </DialogTitle>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="Enter your email"
              />
            </div>
            
            {mode === "login" && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="Enter password"
                />
              </div>
            )}

            <Button type="submit" className="w-full bg-[#f85606] hover:bg-[#d04604] text-white" disabled={loading}>
              {loading ? "Processing..." : (mode === "login" ? "Sign In" : "Continue with Google")}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">Or</span></div>
          </div>

          {mode === "login" ? (
             <Button variant="outline" className="w-full" onClick={() => {
               document.cookie = "auth_intent=register; path=/; max-age=60";
               signIn("google", { callbackUrl: "/account" });
             }}>
               Continue with Google
             </Button>
          ) : null}

          <p className="text-center text-sm text-gray-600">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setMode(mode === "login" ? "register" : "login")} 
              className="text-[#f85606] font-bold hover:underline"
            >
              {mode === "login" ? "Create Account" : "Sign In"}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
