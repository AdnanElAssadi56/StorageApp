"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { updateUserProfile } from "@/lib/actions/user.actions";
import { convertFileToUrl } from "@/lib/utils";
import { toast } from "sonner";
import { MAX_FILE_SIZE } from "@/constants";

interface Props {
  userId: string;
  currentName: string;
  currentAvatar: string;
}

const profileFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(50),
});

const ProfileEditModal = ({ userId, currentName, currentAvatar }: Props) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(currentAvatar);
  const router = useRouter();

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: currentName,
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast("", {
        description: (
          <p className="body-2 text-white">
            Please select an image file (JPG, PNG, GIF, etc.)
          </p>
        ),
        className: "error-toast",
      });
      e.target.value = "";
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast("", {
        description: (
          <p className="body-2 text-white">
            <span className="font-semibold">{file.name}</span> is too large.
            Max file size is 50MB.
          </p>
        ),
        className: "error-toast",
      });
      e.target.value = "";
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(convertFileToUrl(file));
  };

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    setIsLoading(true);
    setErrorMessage("");

    try {

      await updateUserProfile({
        userId,
        fullName: values.fullName !== currentName ? values.fullName : undefined,
        avatarFile: avatarFile || undefined,
      });

      router.refresh();
      setOpen(false);
    } catch (error) {
      setErrorMessage("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="hidden lg:flex text-xs">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="shad-dialog">
        <DialogHeader>
          <DialogTitle className="text-center">Edit Profile</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar Upload */}
            <div className="space-y-2">
              <FormLabel className="shad-form-label">Profile Photo</FormLabel>
              <div className="flex items-center gap-4">
                <Image
                  src={avatarPreview}
                  alt="Avatar preview"
                  width={64}
                  height={64}
                  className="rounded-full object-cover"
                />
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="shad-input"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Click to upload a new profile photo
                  </p>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <div className="shad-form-item">
                    <FormLabel className="shad-form-label">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        className="shad-input"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="shad-form-message" />
                </FormItem>
              )}
            />

            {errorMessage && <p className="error-message">{errorMessage}</p>}

            <Button
              type="submit"
              className="form-submit-button w-full"
              disabled={isLoading}
            >
              Save Changes
              {isLoading && (
                <Image
                  src="/assets/icons/loader.svg"
                  alt="loader"
                  width={24}
                  height={24}
                  className="ml-2 animate-spin"
                />
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditModal;
