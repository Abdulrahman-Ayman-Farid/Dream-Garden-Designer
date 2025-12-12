
import { Component, ChangeDetectionStrategy, signal, computed, inject, WritableSignal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './services/gemini.service';

interface FileData {
  base64: string;
  mimeType: string;
  dataUrl: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [GeminiService],
})
export class AppComponent {
  private geminiService = inject(GeminiService);
  private cdr = inject(ChangeDetectorRef);

  // State Signals
  prompt: WritableSignal<string> = signal('');
  editPrompt: WritableSignal<string> = signal('');
  originalPrompt: WritableSignal<string> = signal('');
  
  uploadedImage: WritableSignal<FileData | null> = signal(null);
  generatedImage: WritableSignal<string | null> = signal(null);
  
  isLoading: WritableSignal<boolean> = signal(false);
  loadingMessage: WritableSignal<string> = signal('');
  error: WritableSignal<string | null> = signal(null);

  private loadingMessages = [
    'Planting the seeds of creativity...',
    'Watering your ideas...',
    'Letting the sunshine in...',
    'Tending to the digital soil...',
    'Your garden is blossoming...',
    'Almost ready for a stroll...',
  ];
  private loadingInterval: any;

  // Computed signal to determine which image to display
  displayImage = computed(() => this.generatedImage() ?? this.uploadedImage()?.dataUrl ?? null);

  startLoading(isGeneration: boolean): void {
    this.isLoading.set(true);
    this.error.set(null);
    let i = 0;
    this.loadingMessage.set(this.loadingMessages[i]);
    this.loadingInterval = setInterval(() => {
      i = (i + 1) % this.loadingMessages.length;
      this.loadingMessage.set(this.loadingMessages[i]);
    }, 2500);
  }

  stopLoading(): void {
    this.isLoading.set(false);
    clearInterval(this.loadingInterval);
  }

  async generateGarden(): Promise<void> {
    if (!this.prompt() || this.isLoading()) return;
    this.startLoading(true);
    this.uploadedImage.set(null);
    this.generatedImage.set(null);

    try {
      const currentPrompt = this.prompt();
      this.originalPrompt.set(currentPrompt);
      const imageBase64 = await this.geminiService.generateGardenImage(currentPrompt);
      this.generatedImage.set(`data:image/jpeg;base64,${imageBase64}`);
    } catch (e) {
      this.handleError(e, 'Failed to generate garden. Please try a different prompt.');
    } finally {
      this.stopLoading();
    }
  }

  async applyEdit(): Promise<void> {
    if (!this.editPrompt() || this.isLoading()) return;
    this.startLoading(false);
    
    try {
      let newPrompt = '';
      if (this.uploadedImage()) {
        const uploaded = this.uploadedImage();
        newPrompt = await this.geminiService.getNewPromptFromImage(uploaded!.base64, uploaded!.mimeType, this.editPrompt());
        this.uploadedImage.set(null);
      } else {
        newPrompt = `${this.originalPrompt()}, ${this.editPrompt()}`;
      }

      this.originalPrompt.set(newPrompt);
      const imageBase64 = await this.geminiService.generateGardenImage(newPrompt);
      this.generatedImage.set(`data:image/jpeg;base64,${imageBase64}`);
      this.editPrompt.set('');
    } catch (e) {
      this.handleError(e, 'Failed to apply edit. Please try again.');
    } finally {
      this.stopLoading();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeTypeMatch = header.match(/:(.*?);/);
      if (!mimeTypeMatch) {
          this.error.set("Could not determine file type.");
          return;
      }
      const mimeType = mimeTypeMatch[1];
      
      this.reset();
      this.uploadedImage.set({ base64, mimeType, dataUrl });
      this.prompt.set(''); // Clear text prompt when image is uploaded
      this.cdr.detectChanges(); // Manually trigger change detection
    };

    reader.onerror = () => {
      this.error.set('Failed to read the selected file.');
      this.cdr.detectChanges();
    };

    reader.readAsDataURL(file);
    input.value = ''; // Reset file input
  }

  reset(): void {
    this.prompt.set('');
    this.editPrompt.set('');
    this.originalPrompt.set('');
    this.generatedImage.set(null);
    this.uploadedImage.set(null);
    this.error.set(null);
    if(this.isLoading()) {
      this.stopLoading();
    }
  }

  private handleError(e: any, message: string): void {
    console.error(e);
    this.error.set(e.message || message);
  }
}
