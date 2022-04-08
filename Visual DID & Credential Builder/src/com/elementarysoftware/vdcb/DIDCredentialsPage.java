package com.elementarysoftware.vdcb;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.List;

import org.eclipse.jface.action.MenuManager;
import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.util.LocalSelectionTransfer;
import org.eclipse.swt.SWT;
import org.eclipse.swt.dnd.DND;
import org.eclipse.swt.dnd.DragSource;
import org.eclipse.swt.dnd.DropTarget;
import org.eclipse.swt.dnd.Transfer;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.widgets.Button;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.FileDialog;
import org.eclipse.swt.widgets.Shell;

import com.elementarysoftware.prism.Contact;
import com.elementarysoftware.prism.DID;
import com.elementarysoftware.prism.jobs.RevokeCredentialJob;
import com.elementarysoftware.prism.jobs.IssueCredentialJob;
import com.elementarysoftware.vdbc.listeners.CredentialBuilderDragSourceListener;
import com.elementarysoftware.vdbc.listeners.CredentialBuilderDropTargetListener;
import com.elementarysoftware.vdbc.listeners.CredentialBuilderMenuListener;
import com.elementarysoftware.vdcb.tree.CredentialBuilderContentProvider;
import com.elementarysoftware.vdcb.tree.CredentialBuilderLabelProvider;
import org.eclipse.swt.widgets.Tree;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.Menu;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;

public class DIDCredentialsPage extends Dialog {

	private DID currentDID;
	private Settings settings;

	/**
	 * Create the dialog.
	 * 
	 * @param parentShell
	 */
	public DIDCredentialsPage(Shell credentialsShell, Settings s) {
		super(credentialsShell);
		settings = s;
		currentDID = (DID) settings.get(Session.CURRENT_DID);
	}

	/**
	 * Create contents of the dialog.
	 * 
	 * @param parent
	 */
	@Override
	protected Control createDialogArea(Composite parent) {
		Composite container = (Composite) super.createDialogArea(parent);
		GridLayout gridLayout = (GridLayout) container.getLayout();
		gridLayout.numColumns = 2;

		TreeViewer treeViewer = new TreeViewer(container, SWT.BORDER);
		Tree tree = treeViewer.getTree();
		GridData gd_tree = new GridData(SWT.FILL, SWT.FILL, true, true, 1, 6);
		gd_tree.heightHint = 173;
		tree.setLayoutData(gd_tree);
		
		JSONObject obj = new JSONObject();
		obj.put("year", 2021);
		obj.put("degree", "Atala Prism Pioneer");
		JSONArray list = new JSONArray(); 
		list.add("property 1"); 
		list.add("property 2");
		list.add(42);
		list.add(3.14);
		obj.put("properties", list);
		
		treeViewer.setContentProvider(new CredentialBuilderContentProvider());
		treeViewer.setLabelProvider(new CredentialBuilderLabelProvider(parent.getDisplay()));
		treeViewer.setInput(obj);
		
		// Add right-click context menu
		MenuManager contextMenu = new MenuManager("Credential Builder Context Menu");
	    contextMenu.setRemoveAllWhenShown(true);
	    contextMenu.addMenuListener(new CredentialBuilderMenuListener(contextMenu, treeViewer));

	    Menu menu = contextMenu.createContextMenu(treeViewer.getControl());
	    treeViewer.getControl().setMenu(menu);
		
		
		// Add drag and drop capabilities the the credential builder tree viewer
		Transfer[] types = new Transfer[] {LocalSelectionTransfer.getTransfer()};
		
		DragSource dragSourceCredentialBuilder = new DragSource(treeViewer.getControl(), DND.DROP_COPY | DND.DROP_LINK | DND.DROP_MOVE);
		dragSourceCredentialBuilder.setTransfer(types);
		dragSourceCredentialBuilder.addDragListener(new CredentialBuilderDragSourceListener(treeViewer));
		
		DropTarget dropTargetCredentialBuilder = new DropTarget(treeViewer.getControl(), DND.DROP_COPY | DND.DROP_LINK | DND.DROP_MOVE);
		dropTargetCredentialBuilder.setTransfer(types);
		dropTargetCredentialBuilder.addDropListener( new CredentialBuilderDropTargetListener(treeViewer));
		
		Button btnIssueCredential = new Button(container, SWT.NONE);
		btnIssueCredential.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				
				// Initialize the issue credential job with JSON Credential to issue and contact that will be issued to (become Holder of credential)
				JSONObject credentialJson = (JSONObject) treeViewer.getInput();
				System.out.println("credential JSON = "+ credentialJson.toJSONString());
				
				SelectContactDialog contactSelection = new SelectContactDialog(getShell(), currentDID.getContacts());
				contactSelection.open();
				Contact holderContact = contactSelection.getSelectedContact();
				
				if(holderContact == null) return;
					
				IssueCredentialJob job = new IssueCredentialJob(currentDID,holderContact,credentialJson,settings);
				Thread t = new Thread(job);
				t.start();
				
			}
		});
		GridData gd_btnIssueCredential = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnIssueCredential.widthHint = 153;
		btnIssueCredential.setLayoutData(gd_btnIssueCredential);
		btnIssueCredential.setBounds(281, 37, 159, 27);
		btnIssueCredential.setText("Issue credential");

		Button btnRevokeCredential = new Button(container, SWT.NONE);
		btnRevokeCredential.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				System.out.println("**** revoke credential ****");
				// load list of credential batches and credential hashes from history
				SelectBatchOrCredentialDialog batchCredentialDlg = new SelectBatchOrCredentialDialog(getShell(),settings);
				batchCredentialDlg.open();
				
				if(batchCredentialDlg.getReturnCode() == Window.OK) {
					List selectedForRevocation = batchCredentialDlg.getSelectedForRevocation();
					
					System.out.println("Objects selected for revocation");
					for(int i = 0; i < selectedForRevocation.size(); i++) {
						System.out.println(selectedForRevocation.get(i).getClass().toString());
					}
				
					RevokeCredentialJob job = new RevokeCredentialJob(settings, selectedForRevocation);
					Thread t = new Thread(job);
					t.start();
				}
			}
		});
		GridData gd_btnRevokeCredential = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnRevokeCredential.widthHint = 149;
		btnRevokeCredential.setLayoutData(gd_btnRevokeCredential);
		btnRevokeCredential.setBounds(281, 70, 159, 27);
		btnRevokeCredential.setText("Revoke credential");
		
		Button btnImportCredential = new Button(container, SWT.NONE);
		GridData gd_btnImportCredential = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnImportCredential.widthHint = 151;
		btnImportCredential.setLayoutData(gd_btnImportCredential);
		btnImportCredential.setText("Import credential");
		
		Button btnSaveAsTemplate = new Button(container, SWT.NONE);
		GridData gd_btnSaveAsTemplate = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnSaveAsTemplate.widthHint = 148;
		btnSaveAsTemplate.setLayoutData(gd_btnSaveAsTemplate);
		btnSaveAsTemplate.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				
				Shell shell = new Shell();
				FileDialog fd = new FileDialog(shell, SWT.SAVE);
		        fd.setText("Save credential as template");
		        String[] filterExt = { "*.json" };
		        fd.setFilterExtensions(filterExt);
		        String selected = fd.open();
		        System.out.println(selected);
		        if(selected == null) return;
		        
		        File jsonFile = new File(selected);
		        JSONObject json = (JSONObject) treeViewer.getInput();
		        
		        // Clone JSON and anonymize values
		        JSONObject jsonClone = (JSONObject) json.clone();
		        jsonClone = anonymizeValues(jsonClone);
		        
		        // Save anonymized JSON clone
		        try {
		        	FileWriter fw = new FileWriter(jsonFile);
		        	jsonClone.writeJSONString(fw);
					fw.close();
				} catch (IOException e1) {
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
		        
			}
		});
		btnSaveAsTemplate.setText("Save as template");
		
		Button btnLoadTemplate = new Button(container, SWT.NONE);
		btnLoadTemplate.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				Shell shell = new Shell();
				FileDialog fd = new FileDialog(shell, SWT.OPEN);
		        fd.setText("Open credential template");
		        String[] filterExt = { "*.json" };
		        fd.setFilterExtensions(filterExt);
		        String selected = fd.open();
		        System.out.println(selected);
		        if(selected == null) return;
		        
		        JSONParser jsonParser = new JSONParser();
				try {
					File jsonFile = new File(selected);
					FileReader fr = new FileReader(jsonFile);
					JSONObject jsonObject = (JSONObject) jsonParser.parse(fr);
					if(jsonObject != null) {
						treeViewer.setInput(jsonObject);
						treeViewer.refresh();
					}
					else {
						System.err.println("unable to read credential json template");
					}
				} catch (IOException ioe) {
					ioe.printStackTrace();
				} catch (ParseException pe) {
					pe.printStackTrace();
				}
			}
		});
		GridData gd_btnLoadTemplate = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnLoadTemplate.widthHint = 151;
		btnLoadTemplate.setLayoutData(gd_btnLoadTemplate);
		btnLoadTemplate.setText("Load template");
		new Label(container, SWT.NONE);

		return container;
	}
	
	protected JSONObject anonymizeValues(JSONObject jsonClone) {
		//TODO: loop JSONObject and replace values with random default values of correct type
		
		
		//TODO: Check if necessary to return object, or object references will handle this without return
		return jsonClone;
	}

	/**
	 * Create contents of the button bar.
	 * 
	 * @param parent
	 */
	@Override
	protected void createButtonsForButtonBar(Composite parent) {
		createButton(parent, IDialogConstants.OK_ID, IDialogConstants.OK_LABEL, true);
		// createButton(parent, IDialogConstants.CANCEL_ID,
		// IDialogConstants.CANCEL_LABEL, false);
	}

	/**
	 * Return the initial size of the dialog.
	 */
	@Override
	protected Point getInitialSize() {
		return new Point(450, 300);
	}

}
