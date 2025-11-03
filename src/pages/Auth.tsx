import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // ✅ Forgot password handler
  const handleForgotPassword = async () => {
    const email = prompt("Enter your email to reset your password:");
    if (!email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("A password reset link has been sent to your email.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      if (mode === "login") {
        signInSchema.parse(data);

        // 👇 Dynamic Supabase persistence
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email as string,
          password: data.password as string,
          options: {
            shouldCreateUser: false,
            persistSession: rememberMe,
            storage: rememberMe ? localStorage : sessionStorage,
          },
        });

        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        signUpSchema.parse(data);

        const { error } = await signUp(
          data.email as string,
          data.password as string,
          data.username as string
        );

        if (error) throw error;
        toast.success("Account created successfully!");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
      {/* Background video */}
      <video
         ref={(el) => {
          if (el) el.playbackRate = 0.5; // 👈 0.5 = half speed (slow motion)
      }}
        className="absolute inset-0 w-full h-full object-cover"
        src="/video.mp4"
        autoPlay
        playsInline
        loop
        muted
      />
      <div className="absolute inset-0 bg-[#00131a]/70 backdrop-blur-sm" />

      <AnimatePresence mode="wait">
        {mode === "login" ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -25 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative z-10 w-[90%] max-w-md bg-white/95 rounded-2xl p-8 md:p-10 shadow-[0_0_25px_#00FFFF55] flex flex-col items-center text-center backdrop-blur-md"
          >
            <img
              src="/logo.png"
              alt="Mount Carmel Logo"
              className="h-20 w-auto mb-3"
            />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Welcome Back
            </h2>
            <p className="text-sm md:text-base text-gray-500 mb-6">
              Log in to continue to your dashboard.
            </p>

            <form onSubmit={handleAuth} className="w-full space-y-6">
              <div className="relative">
                <Input
                  name="email"
                  type="email"
                  placeholder="Email"
                  className="bg-transparent border-0 border-b-2 border-cyan-400 pl-3 pr-10 text-gray-800 rounded-none focus-visible:ring-0 focus:border-cyan-500"
                  required
                />
                <Mail className="absolute right-2 top-2.5 h-4 w-4 text-cyan-500" />
              </div>

              <div className="relative">
                <Input
                  name="password"
                  type="password"
                  placeholder="Password"
                  className="bg-transparent border-0 border-b-2 border-cyan-400 pl-3 pr-10 text-gray-800 rounded-none focus-visible:ring-0 focus:border-cyan-500"
                  required
                />
                <Lock className="absolute right-2 top-2.5 h-4 w-4 text-cyan-500" />
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between text-xs md:text-sm text-gray-600">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  Remember me
                </label>
                <span
                  onClick={handleForgotPassword}
                  className="cursor-pointer text-cyan-500 hover:underline"
                >
                  Forgot password?
                </span>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-semibold rounded-full shadow-[0_0_15px_#00FFFFAA] hover:shadow-[0_0_25px_#00FFFF] transition-all duration-300"
              >
                {isLoading ? "Signing in..." : "Login"}
              </Button>
            </form>

            <p className="mt-6 text-xs md:text-sm text-gray-500">
              Don’t have an account?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-cyan-500 hover:underline"
              >
                Sign up
              </button>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -25 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative z-10 w-[90%] max-w-md bg-white/95 rounded-2xl p-8 md:p-10 shadow-[0_0_25px_#00FFFF55] flex flex-col items-center text-center backdrop-blur-md"
          >
            <img
              src="/logo.png"
              alt="Mount Carmel Logo"
              className="h-20 w-auto mb-3"
            />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Welcome
            </h2>
            <p className="text-sm md:text-base text-gray-500 mb-6">
              Create your account to get started.
            </p>

            <form onSubmit={handleAuth} className="w-full space-y-6">
              <div className="relative">
                <Input
                  name="username"
                  type="text"
                  placeholder="Username"
                  className="bg-transparent border-0 border-b-2 border-cyan-400 pl-3 pr-10 text-gray-800 rounded-none focus-visible:ring-0 focus:border-cyan-500"
                  required
                />
                <User className="absolute right-2 top-2.5 h-4 w-4 text-cyan-500" />
              </div>

              <div className="relative">
                <Input
                  name="email"
                  type="email"
                  placeholder="Email"
                  className="bg-transparent border-0 border-b-2 border-cyan-400 pl-3 pr-10 text-gray-800 rounded-none focus-visible:ring-0 focus:border-cyan-500"
                  required
                />
                <Mail className="absolute right-2 top-2.5 h-4 w-4 text-cyan-500" />
              </div>

              <div className="relative">
                <Input
                  name="password"
                  type="password"
                  placeholder="Password"
                  className="bg-transparent border-0 border-b-2 border-cyan-400 pl-3 pr-10 text-gray-800 rounded-none focus-visible:ring-0 focus:border-cyan-500"
                  required
                />
                <Lock className="absolute right-2 top-2.5 h-4 w-4 text-cyan-500" />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-semibold rounded-full shadow-[0_0_15px_#00FFFFAA] hover:shadow-[0_0_25px_#00FFFF] transition-all duration-300"
              >
                {isLoading ? "Creating..." : "Sign Up"}
              </Button>
            </form>

            <p className="mt-6 text-xs md:text-sm text-gray-500">
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-cyan-500 hover:underline"
              >
                Login
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
