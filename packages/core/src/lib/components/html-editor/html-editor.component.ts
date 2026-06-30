import { Component, forwardRef, ChangeDetectorRef, Input, OnInit, OnDestroy, ViewChild, ElementRef, NgZone, Optional, Self, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, FormsModule, ReactiveFormsModule, NgControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { DynamicFieldFormComponent } from '../dynamic-form/dynamic-field-form/dynamic-field-form.component';
import { FormService } from '../../services/dynamic-form/form.service';
import { I18nService } from '../../services/i18n-service/i18n.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

declare var tinymce: any;

@Component({
    selector: 'fwk-html-editor',
    templateUrl: './html-editor.component.html',
    styleUrls: ['./html-editor.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatDialogModule
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => HtmlEditorComponent),
            multi: true
        }
    ]
})
export class HtmlEditorComponent extends DynamicFieldFormComponent<string> implements OnInit, OnDestroy {

    @ViewChild('editorElem', { static: true }) editorElem!: ElementRef;

    editorId: string = `tiny-editor-${Math.random().toString(36).substring(2, 9)}`;
    private editor: any;

    private baseConfig: any = {
        language: 'es',
        language_url: '/assets/tinymce/langs/es.js',
        base_url: '/tinymce',
        suffix: '.min',
        height: 500,
        menubar: 'file edit view insert format tools table help',
        menu: {
            insert: { title: 'Insertar', items: 'image link media codesample inserttable | charmap emoticons hr | pagebreak nonbreaking anchor | insertdatetime | insert_template' }
        },
        branding: false,
        promotion: false,
        autosave_ask_before_unload: true,
        autosave_interval: '30s',
        autosave_restore_when_empty: false,
        autosave_retention: '2m',
        image_advtab: true,
        importcss_append: true,
        template_cdate_format: '[Fecha: %m/%d/%Y a las %H:%M:%S]',
        template_mdate_format: '[Modificado: %m/%d/%Y a las %H:%M:%S]',
        quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote quickimage quicktable',
        noneditable_class: 'mceNonEditable',
        toolbar_mode: 'sliding',
        contextmenu: 'link image table',
        skin: 'oxide',
        content_css: 'default',
        plugins: [
            'preview', 'importcss', 'searchreplace', 'autolink', 'autosave', 'save',
            'directionality', 'code', 'visualblocks', 'visualchars', 'fullscreen',
            'image', 'link', 'media', 'codesample', 'table', 'charmap', 'pagebreak',
            'nonbreaking', 'anchor', 'insertdatetime', 'advlist', 'lists', 'wordcount',
            'help', 'charmap', 'quickbars', 'emoticons', 'accordion', 'visualchars'
        ],
        toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | charmap emoticons | fullscreen  preview save print insert_template | insertfile image media link anchor codesample accordion | ltr rtl',
        save_onsavecallback: () => {
            const content = this.editor.getContent();
            this._value = content;
            this.onChange(content);
            this.onTouch();
        },
        setup: (editor: any) => {
            this.editor = editor;

            editor.ui.registry.addButton('insert_template', {
                tooltip: this.i18nService.translate('html_editor_insert_template_tooltip'),
                icon: 'template',
                onAction: () => this.openTemplateDialog(editor)
            });

            editor.ui.registry.addMenuItem('insert_template', {
                text: this.i18nService.translate('html_editor_template_menu_item'),
                icon: 'template',
                onAction: () => this.openTemplateDialog(editor)
            });

            editor.on('init', () => {
                if (this._value) {
                    editor.setContent(this._value);
                }
                if (this.isDisabled) {
                    editor.mode.set('readonly');
                }
                
                editor.on('Change KeyUp Undo Redo input ExecCommand SetContent NodeChange', () => {
                    this.ngZone.run(() => {
                        const content = editor.getContent();
                        if (content === '' && this._value && this._value !== '') {
                             return;
                        }
                        
                        if (this._value !== content) {
                            this._value = content;
                            this.onChange(content);
                            this.onTouch();
                            this.cdr.detectChanges();
                        }
                    });
                });
                
                this.cdr.detectChanges();
            });
        }
    };

    private i18nService: I18nService;

    constructor(
        private cdr: ChangeDetectorRef,
        private dialog: MatDialog,
        private formService: FormService,
        private ngZone: NgZone,
        injector: Injector
    ) {
        super();
        this.i18nService = injector.get(I18nService);
    }

    ngOnInit(): void {
        this.baseConfig.menu.insert.title = this.i18nService.translate('html_editor_insert_menu');
        setTimeout(() => {
            this.initEditor();
        }, 0);
    }

    ngOnDestroy(): void {
        if (this.editor) {
            tinymce.remove(this.editor);
        }
    }

    private initEditor(): void {
        const finalConfig = {
            ...this.baseConfig,
            selector: `#${this.editorId}`,
            height: (this.field?.options as any)?.['height'] || 500
        };

        if ((this.field?.options as any)?.['init']) {
            Object.assign(finalConfig, (this.field.options as any)['init']);
        }

        const templates$ = this.formService.editorTemplates?.length > 0
            ? of(this.formService.editorTemplates)
            : this.formService.setEditorTemplates();

        templates$.subscribe({
            next: (templates) => {
                if (templates?.length > 0) {
                    finalConfig.templates = templates.map((t: any) => ({
                        title: t.name || t.title,
                        description: t.description || '',
                        content: t.content || t.html
                    }));
                }
                this.initializeTinyMce(finalConfig);
            },
            error: () => {
                this.initializeTinyMce(finalConfig);
            }
        });
    }

    private initializeTinyMce(config: any): void {
        tinymce.init(config);
    }

    private openTemplateDialog(editor: any): void {
        if (!this.formService.editorTemplates || this.formService.editorTemplates.length === 0) {
            editor.notificationManager.open({
                text: this.i18nService.translate('html_editor_no_templates'),
                type: 'info',
                timeout: 3000
            });
            return;
        }

        const templateItems = this.formService.editorTemplates.map((t: any) => ({
            text: t.name || t.title,
            value: t.content || t.html
        }));

        editor.windowManager.open({
            title: this.i18nService.translate('html_editor_template_dialog_title'),
            body: {
                type: 'panel',
                items: [
                    {
                        type: 'selectbox',
                        name: 'templateContent',
                        label: this.i18nService.translate('html_editor_select_template_label'),
                        items: templateItems
                    }
                ]
            },
            buttons: [
                {
                    type: 'cancel',
                    text: this.i18nService.translate('action_close')
                },
                {
                    type: 'submit',
                    text: this.i18nService.translate('html_editor_insert_template_tooltip'),
                    primary: true
                }
            ],
            onSubmit: (api: any) => {
                const data = api.getData();
                if (data.templateContent) {
                    editor.insertContent(data.templateContent);
                }
                api.close();
            }
        });
    }

    override writeValue(value: string | null): void {
        this._value = value || '';
        if (this.editor && this.editor.initialized) {
            this.editor.setContent(this._value);
        }
        this.cdr.markForCheck();
    }

    override setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        if (this.editor && this.editor.initialized) {
            this.editor.mode.set(isDisabled ? 'readonly' : 'design');
        }
        this.cdr.markForCheck();
    }

    openFullscreen(): void {
        if (this.editor) {
            this.editor.execCommand('mceFullScreen');
        }
    }
}
